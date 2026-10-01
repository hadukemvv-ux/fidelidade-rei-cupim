import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

// One process owns this small pilot store. Never recover a corrupt session as a
// new login: wrong keys, failed writes and duplicate workers must fail closed.
export async function openSessionStore({ directory, keyHex, initCredentials, codec = {}, restoreKey = (_type, value) => value }) {
  if (!isAbsolute(directory) || !/^[a-f0-9]{64}$/i.test(keyHex)) throw new Error('Invalid session storage configuration');
  const key = Buffer.from(keyHex, 'hex');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = join(directory, 'session.lock');
  const lock = await open(lockPath, 'wx', 0o600);
  const file = join(directory, 'session.enc');
  let document;
  try {
    const bytes = await readFile(file);
    if (bytes.length < 29 || bytes.length > 16 * 1024 * 1024 || bytes[0] !== 1) throw new Error('Invalid session');
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(1, 13));
    decipher.setAAD(Buffer.from('clube-cupim-session-v1'));
    decipher.setAuthTag(bytes.subarray(13, 29));
    document = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(29)), decipher.final()]).toString(), codec.reviver);
    if (!document.creds || !document.keys) throw new Error('Invalid session');
  } catch (error) {
    if (error.code === 'ENOENT') document = { creds: initCredentials(), keys: Object.create(null) };
    else { await lock.close(); await unlink(lockPath); throw new Error('Cannot unlock saved session'); }
  }
  let queue = Promise.resolve();
  let closed = false;
  let onFailure = () => {};
  function persist() {
    if (closed) return Promise.reject(new Error('Store closed'));
    // Snapshot now, write in order. A failure poisons the queue intentionally.
    const plain = JSON.stringify(document, codec.replacer);
    queue = queue.then(async () => {
      if (Buffer.byteLength(plain) > 16 * 1024 * 1024 - 29) throw new Error('Session too large');
      const nonce = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, nonce);
      cipher.setAAD(Buffer.from('clube-cupim-session-v1'));
      const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
      const handle = await open(`${file}.tmp`, 'w', 0o600);
      try { await handle.writeFile(Buffer.concat([Buffer.from([1]), nonce, cipher.getAuthTag(), encrypted])); await handle.sync(); }
      finally { await handle.close(); }
      await rename(`${file}.tmp`, file);
      if (process.platform !== 'win32') {
        const parent = await open(directory, 'r');
        try { await parent.sync(); } finally { await parent.close(); }
      }
    });
    // Key writes happen inside Baileys too; notify the controller even when the
    // library consumes the rejected promise internally.
    void queue.catch(() => onFailure());
    return queue;
  }
  return {
    // OTP ledger is separate from the fixed-test ledger and contains no code,
    // phone or text. Retain 24h (payloads expire in 10min); preserve the
    // fixed-test ledger. Cleanup occurs before each valid new reservation.
    async reserveOtpSend(id, fingerprint, phoneHash, nowMs) {
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id) ||
        !/^[a-f0-9]{64}$/.test(fingerprint) || !/^[a-f0-9]{64}$/.test(phoneHash) || !Number.isFinite(nowMs)) throw new Error('Invalid OTP reservation');
      document.otpSends ??= [];
      let rows = document.otpSends;
      if (!Array.isArray(rows) || rows.length > 1000 || rows.some(row => !row ||
        typeof row.id !== 'string' || !/^[a-f0-9]{64}$/.test(row.fingerprint) || !/^[a-f0-9]{64}$/.test(row.phoneHash) ||
        !Number.isFinite(row.createdAt) || !['pending', 'accepted', 'unknown'].includes(row.status))) throw new Error('Invalid OTP ledger');
      // A backwards clock must not make previously pruned payloads valid again
      // or shorten the quota window. Persist this watermark across restarts.
      const lastReservation = document.otpLastReservationAt ?? Math.max(0, ...rows.map(row => row.createdAt));
      if (!Number.isFinite(lastReservation) || nowMs < lastReservation) throw new Error('Invalid OTP clock');
      rows = rows.filter(row => row.createdAt >= nowMs - 86_400_000);
      document.otpSends = rows;
      const existing = rows.find(row => row.id === id);
      if (existing) {
        if (existing.fingerprint !== fingerprint || existing.phoneHash !== phoneHash) throw new Error('OTP conflict');
        return { reserved: false, status: existing.status === 'pending' ? 'unknown' : existing.status };
      }
      // Same hard limits on the worker even if the upstream service misbehaves.
      const recent = rows; // Includes the exact 24h boundary, as the SQL quota does.
      const phoneRows = recent.filter(row => row.phoneHash === phoneHash);
      if (rows.length >= 1000 || recent.length >= 30 ||
        phoneRows.filter(row => row.createdAt >= nowMs - 3_600_000).length >= 3 ||
        phoneRows.some(row => row.createdAt > nowMs - 60_000)) throw new Error('OTP limit');
      rows.push({ id, fingerprint, phoneHash, createdAt: nowMs, status: 'pending' });
      document.otpLastReservationAt = nowMs;
      await persist();
      return { reserved: true };
    },
    async finishOtpSend(id, status) {
      const row = document.otpSends?.find(row => row.id === id);
      if (!row || row.status !== 'pending' || !['accepted', 'unknown'].includes(status)) throw new Error('Invalid OTP result');
      row.status = status;
      await persist();
    },
    // A tiny pilot ledger, encrypted with the session. Never store phone/text.
    // Keep it through unlinking; a new request ID alone cannot repeat a test.
    // An explicitly approved repeat must match the private worker configuration.
    async reserveTestSend(id, recipientHash, approvedRequestId) {
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id) || !/^[a-f0-9]{64}$/.test(recipientHash)) throw new Error('Invalid test reservation');
      if (approvedRequestId !== undefined && approvedRequestId !== id) throw new Error('Invalid test approval');
      document.testSends ??= [];
      if (!Array.isArray(document.testSends) || document.testSends.length > 20 || document.testSends.some(row =>
        !row || typeof row.id !== 'string' || !/^[a-f0-9]{64}$/.test(row.recipientHash) || !['pending', 'accepted', 'unknown'].includes(row.status))) throw new Error('Invalid test ledger');
      const byId = document.testSends.find(row => row.id === id);
      if (byId && byId.recipientHash !== recipientHash) throw new Error('Test request conflict');
      const existing = byId || (approvedRequestId === undefined ? document.testSends.find(row => row.recipientHash === recipientHash) : undefined);
      if (existing) return { reserved: false, status: existing.status === 'pending' ? 'unknown' : existing.status };
      if (document.testSends.length >= 20) throw new Error('Test limit reached');
      document.testSends.push({ id, recipientHash, status: 'pending', ...(approvedRequestId ? { explicitlyApproved: true } : {}) });
      await persist();
      return { reserved: true };
    },
    async finishTestSend(id, status) {
      if (!['accepted', 'unknown'].includes(status)) throw new Error('Invalid test result');
      const row = document.testSends?.find(row => row.id === id);
      if (!row || row.status !== 'pending') throw new Error('Missing test reservation');
      row.status = status;
      await persist();
    },
    setFailureHandler(handler) { onFailure = handler; },
    state: {
      creds: document.creds,
      keys: {
        async get(type, ids) {
          const result = Object.create(null);
          for (const id of ids) {
            const value = Object.hasOwn(document.keys, type) && Object.hasOwn(document.keys[type], id) ? document.keys[type][id] : undefined;
            if (value !== undefined) result[id] = restoreKey(type, value);
          }
          return result;
        },
        async set(data) {
          for (const [type, values] of Object.entries(data)) {
            if (!Object.hasOwn(document.keys, type)) Object.defineProperty(document.keys, type, { value: Object.create(null), enumerable: true, configurable: true });
            for (const [id, value] of Object.entries(values)) {
              if (value == null) delete document.keys[type][id];
              else Object.defineProperty(document.keys[type], id, { value, enumerable: true, configurable: true, writable: true });
            }
          }
          await persist();
        },
      },
    },
    async update(partial) { Object.assign(document.creds, partial); await persist(); },
    async clear() {
      await queue;
      for (const name of Object.keys(document.creds)) delete document.creds[name];
      Object.assign(document.creds, initCredentials());
      document.keys = Object.create(null);
      await persist();
    },
    async close() {
      if (closed) return;
      closed = true;
      try { await queue; } finally { key.fill(0); await lock.close(); await unlink(lockPath); }
    },
  };
}
