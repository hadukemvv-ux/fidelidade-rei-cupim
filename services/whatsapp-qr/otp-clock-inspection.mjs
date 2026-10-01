import { createDecipheriv } from 'node:crypto';
import { open, readFile, unlink } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAY = 86_400_000;
const validTime = value => Number.isSafeInteger(value) && value >= 0 && value <= 8_640_000_000_000_000 - DAY - 1;

/** Offline inspection only. Own the normal lock, never rewrite session.enc,
 * connect a socket, lower the watermark, prune rows or reset credentials. */
export async function inspectOtpClock({ directory, keyHex, nowMs = Date.now() }) {
  const repo = fileURLToPath(new URL('../../', import.meta.url));
  const rel = relative(repo, resolve(directory || '.'));
  if (!isAbsolute(directory || '') || !(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) ||
    !/^[a-f0-9]{64}$/i.test(keyHex || '') || !validTime(nowMs)) throw new Error('Invalid inspection configuration');
  const key = Buffer.from(keyHex, 'hex');
  let lock, plain;
  const lockPath = join(directory, 'session.lock');
  try {
    lock = await open(lockPath, 'wx', 0o600);
    const bytes = await readFile(join(directory, 'session.enc'));
    if (bytes.length < 29 || bytes.length > 16 * 1024 * 1024 || bytes[0] !== 1) throw new Error('Invalid session');
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(1, 13));
    decipher.setAAD(Buffer.from('clube-cupim-session-v1'));
    decipher.setAuthTag(bytes.subarray(13, 29));
    plain = Buffer.concat([decipher.update(bytes.subarray(29)), decipher.final()]);
    const document = JSON.parse(plain.toString());
    if (!document.creds || !document.keys) throw new Error('Invalid session');
    const rows = document.otpSends ?? [];
    if (!Array.isArray(rows) || rows.length > 1000 || rows.some(row => !row || !validTime(row.createdAt) ||
      typeof row.id !== 'string' || !/^[a-f0-9]{64}$/.test(row.fingerprint || '') ||
      !/^[a-f0-9]{64}$/.test(row.phoneHash || '') || !['pending','accepted','unknown'].includes(row.status))) throw new Error('Invalid ledger');
    const newest = Math.max(0, ...rows.map(row => row.createdAt));
    const watermark = document.otpLastReservationAt ?? newest;
    if (!validTime(watermark)) throw new Error('Invalid watermark');
    // Even lowering only the watermark would leave future quota timestamps.
    const latest = Math.max(watermark, newest);
    const regressed = nowMs < latest;
    return {
      status: regressed ? 'clock_regressed' : 'ok',
      checked_at: new Date(nowMs).toISOString(),
      otp_last_reservation_at: watermark ? new Date(watermark).toISOString() : null,
      newest_retained_reservation_at: newest ? new Date(newest).toISOString() : null,
      retained_reservations: rows.length,
      future_reservations: rows.filter(row => row.createdAt > nowMs).length,
      // Conservative, not a promised uptime: assumes no new reservations and a
      // correctly synchronized clock. After this all old quotas can expire.
      conservative_resume_after: regressed ? new Date(latest + DAY + 1).toISOString() : null,
    };
  } catch {
    throw new Error('Inspection unavailable: check stopped worker, private configuration and saved session.');
  } finally {
    plain?.fill(0); key.fill(0);
    if (lock) { await lock.close(); await unlink(lockPath); }
  }
}
