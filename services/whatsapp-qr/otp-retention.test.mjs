import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openSessionStore } from './session-store.mjs';
import { createOtpSender } from './otp-send.mjs';

const keyHex = 'ab'.repeat(32), hash = 'c'.repeat(64), phoneHash = 'd'.repeat(64);
const start = Date.parse('2026-09-30T18:00:00Z'), day = 86_400_000;
const configuration = directory => ({ directory, keyHex, initCredentials: () => ({ fixture: true }) });
async function snapshot(directory) {
  const bytes = await readFile(join(directory, 'session.enc'));
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), bytes.subarray(1, 13));
  decipher.setAAD(Buffer.from('clube-cupim-session-v1'));
  decipher.setAuthTag(bytes.subarray(13, 29));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(29)), decipher.final()]).toString());
}

test('OTP retention: >1000 historical requests stay bounded without erasing fixed-test/session data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-otp-retention-'));
  let store;
  try {
    store = await openSessionStore(configuration(directory));
    await store.reserveTestSend(randomUUID(), hash);
    await store.state.keys.set({ fixture: { key: 'fictional-session-data' } });
    // Over 45 days: one request/65min stays inside all rolling quotas.
    for (let i = 0; i < 1005; i++) {
      assert.equal((await store.reserveOtpSend(randomUUID(), hash, phoneHash, start + i * 3_900_000)).reserved, true);
    }
    const data = await snapshot(directory);
    assert.equal(data.otpSends.length, 23);
    assert.equal(data.testSends.length, 1);
    assert.equal(data.creds.fixture, true);
    assert.equal(data.keys.fixture.key, 'fictional-session-data');
    await store.close(); store = null;
    store = await openSessionStore(configuration(directory));
    assert.equal((await store.reserveTestSend(randomUUID(), hash)).reserved, false);
    await assert.rejects(store.reserveOtpSend(randomUUID(), hash, phoneHash, start), /clock/);
  } finally { await store?.close(); await rm(directory, { recursive: true, force: true }); }
});

test('OTP retention preserves exact 24h boundary and current day/hour quotas after restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-otp-boundary-'));
  let store;
  try {
    store = await openSessionStore(configuration(directory));
    const first = randomUUID();
    await store.reserveOtpSend(first, hash, phoneHash, start);
    assert.deepEqual(await store.reserveOtpSend(first, hash, phoneHash, start + day), { reserved: false, status: 'unknown' });
    assert.equal((await store.reserveOtpSend(randomUUID(), hash, phoneHash, start + day)).reserved, true);
    assert.equal((await snapshot(directory)).otpSends.length, 2);
    await assert.rejects(store.reserveOtpSend(randomUUID(), hash, phoneHash, start + day + 1), /limit/);
    await store.close(); store = null;
    store = await openSessionStore(configuration(directory));
    await store.reserveOtpSend(randomUUID(), hash, phoneHash, start + day + 60_001);
    assert.equal((await snapshot(directory)).otpSends.length, 2);
    await store.reserveOtpSend(randomUUID(), hash, phoneHash, start + day + 120_002);
    await assert.rejects(store.reserveOtpSend(randomUUID(), hash, phoneHash, start + day + 180_003), /limit/);
  } finally { await store?.close(); await rm(directory, { recursive: true, force: true }); }
});

test('OTP retention cannot release the rolling daily quota at the exact 24h boundary', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-otp-day-limit-'));
  let store;
  try {
    store = await openSessionStore(configuration(directory));
    const phones = ['d', 'e', 'f'].map(value => value.repeat(64));
    for (let i = 0; i < 30; i++) await store.reserveOtpSend(randomUUID(), hash, phones[i % 3], start + i * 420_000);
    await assert.rejects(store.reserveOtpSend(randomUUID(), hash, phoneHash, start + day), /limit/);
    await store.close(); store = null;
    store = await openSessionStore(configuration(directory));
    await assert.rejects(store.reserveOtpSend(randomUUID(), hash, phoneHash, start + day), /limit/);
    assert.equal((await store.reserveOtpSend(randomUUID(), hash, phoneHash, start + day + 1)).reserved, true);
    assert.equal((await snapshot(directory)).otpSends.length, 30);
  } finally { await store?.close(); await rm(directory, { recursive: true, force: true }); }
});

test('OTP retention: expired payload cannot replay after pruning/restart or backwards clock', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-otp-expired-'));
  let store, time = start, calls = 0;
  const recipient = '+5585988887777'; // Fictional fixture; no network.
  const env = { WHATSAPP_QR_OTP_ENABLED: 'true', WHATSAPP_QR_SESSION_KEY: keyHex,
    WHATSAPP_QR_CONTROL_TOKEN: 'cd'.repeat(32), WHATSAPP_QR_OTP_TOKEN: 'ef'.repeat(32), WHATSAPP_QR_OTP_RECIPIENTS: recipient };
  const controller = { async runConnected(run) { return run({
    async onWhatsApp() { calls++; return [{ exists: true, jid: '5585988887777@s.whatsapp.net' }]; },
    async sendMessage() { calls++; return { key: { id: 'fixture' } }; },
  }); } };
  const payload = { request_id: randomUUID(), recipient, code: '000123', expires_at: new Date(start + 600_000).toISOString() };
  try {
    store = await openSessionStore(configuration(directory));
    let sender = createOtpSender({ env, store, controller, now: () => time });
    assert.equal((await sender.send(payload)).status, 'accepted');
    assert.equal(calls, 2);
    time += day + 1;
    await sender.send({ ...payload, request_id: randomUUID(), expires_at: new Date(time + 600_000).toISOString() });
    assert.equal((await snapshot(directory)).otpSends.length, 1);
    await store.close(); store = null;
    store = await openSessionStore(configuration(directory));
    sender = createOtpSender({ env, store, controller, now: () => time });
    await assert.rejects(sender.send(payload), /Expired/);
    time = start;
    await assert.rejects(sender.send(payload), /clock/);
    assert.equal(calls, 4);
  } finally { await store?.close(); await rm(directory, { recursive: true, force: true }); }
});
