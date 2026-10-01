import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openSessionStore } from './session-store.mjs';
import { createSessionController } from './session-controller.mjs';
import { createOtpSender } from './otp-send.mjs';
import { createControlServer } from './http-server.mjs';

const recipient = '+5585988887777'; // Fictional fixture.
const env = { WHATSAPP_QR_OTP_ENABLED: 'true', WHATSAPP_QR_SESSION_KEY: 'ab'.repeat(32),
  WHATSAPP_QR_CONTROL_TOKEN: 'cd'.repeat(32), WHATSAPP_QR_OTP_TOKEN: 'ef'.repeat(32), WHATSAPP_QR_OTP_RECIPIENTS: recipient };
const nowMs = Date.parse('2026-09-30T18:00:00.000Z');
const input = () => ({ request_id: randomUUID(), recipient, code: '000123', expires_at: new Date(nowMs + 600_000).toISOString() });
async function harness(directory, send = async () => ({ key: { id: 'fixture' } }), now = () => nowMs,
  lookup = async () => [{ exists: true, jid: '558588887777@s.whatsapp.net' }]) {
  const store = await openSessionStore({ directory, keyHex: env.WHATSAPP_QR_SESSION_KEY, initCredentials: () => ({}) });
  const socket = { ev: new EventEmitter(), end() {}, async logout() {}, sendMessage: send, onWhatsApp: lookup };
  const controller = createSessionController({ store, makeSocket: () => socket });
  await controller.command('connect'); socket.ev.emit('connection.update', { connection: 'open' });
  return { store, socket, controller, sender: createOtpSender({ env, store, controller, timeoutMs: 20, now }) };
}
async function withHarness(run, ...args) {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-otp-test-'));
  let h;
  try { h = await harness(directory, ...args); await run(h, directory); }
  finally { await h?.controller.close(); await rm(directory, { recursive: true, force: true }); }
}

test('OTP worker defaults off, requires separate token and closed small allowlist', () => {
  assert.equal(createOtpSender({ env }).enabled, true);
  for (const bad of [{}, { ...env, WHATSAPP_QR_OTP_ENABLED: 'false' }, { ...env, WHATSAPP_QR_OTP_TOKEN: env.WHATSAPP_QR_CONTROL_TOKEN },
    { ...env, WHATSAPP_QR_OTP_TOKEN: env.WHATSAPP_QR_SESSION_KEY }, { ...env, WHATSAPP_QR_OTP_RECIPIENTS: '' },
    { ...env, WHATSAPP_QR_OTP_RECIPIENTS: [recipient, recipient, recipient, recipient].join(',') }]) {
    assert.equal(createOtpSender({ env: bad }).enabled, false);
  }
});

test('OTP resolves actual JID; concurrent/reordered payload/restart/unlink never resend', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-otp-restart-'));
  let h, calls = 0;
  const send = async (jid, body) => {
    calls++; assert.equal(jid, '558588887777@s.whatsapp.net');
    assert.deepEqual(body, { text: 'Clube Cupim: seu código de verificação é 000123. Válido por 10 minutos. Não compartilhe.' });
    return { key: { id: 'private-id' } };
  };
  try {
    h = await harness(directory, send);
    const value = input();
    const results = await Promise.all([h.sender.send(value), h.sender.send(value)]);
    assert.deepEqual(results, [{ status: 'accepted', duplicate: false }, { status: 'accepted', duplicate: true }]);
    const reordered = { code: value.code, recipient: value.recipient, request_id: value.request_id, expires_at: value.expires_at };
    assert.equal((await h.sender.send(reordered)).duplicate, true);
    await assert.rejects(h.sender.send({ ...value, code: '999999' }), /conflict/);
    await h.controller.command('disconnect'); await h.controller.close(); h = null;
    h = await harness(directory, send);
    assert.equal((await h.sender.send(value)).duplicate, true); assert.equal(calls, 1);
    const bytes = await readFile(join(directory, 'session.enc'));
    assert.equal(bytes.includes(Buffer.from(recipient)), false); assert.equal(bytes.includes(Buffer.from(value.code)), false);
  } finally { await h?.controller.close(); await rm(directory, { recursive: true, force: true }); }
});

test('OTP send timeout/empty acceptance/failure is unknown, never retried', async () => {
  for (const send of [async () => { throw new Error('private'); }, async () => undefined, () => new Promise(() => {})]) {
    await withHarness(async h => {
      const value = input();
      assert.deepEqual(await h.sender.send(value), { status: 'unknown', duplicate: false });
      assert.deepEqual(await h.sender.send(value), { status: 'unknown', duplicate: true });
    }, send);
  }
});

test('uncertain OTP after reopen cannot send again, and reservation failure never reaches transport', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-otp-unknown-'));
  let h, calls = 0;
  const value = input();
  try {
    h = await harness(directory, async () => { calls++; throw new Error('timeout'); });
    await h.sender.send(value);
    await h.controller.close(); h = null;
    h = await harness(directory, async () => { calls++; return { key: { id: 'unexpected' } }; });
    assert.deepEqual(await h.sender.send(value), { status: 'unknown', duplicate: true });
    assert.equal(calls, 1);
    h.store.reserveOtpSend = async () => { throw new Error('disk unavailable'); };
    await assert.rejects(h.sender.send(input()), /disk unavailable/);
    assert.equal(calls, 1);
  } finally { await h?.controller.close(); await rm(directory, { recursive: true, force: true }); }
});

test('invalid/expired payload, wrong recipient, groups and lookup ambiguity never send', async () => {
  let calls = 0;
  await withHarness(async h => {
    const value = input();
    for (const bad of [null, {}, { ...value, recipient: 'group@g.us' }, { ...value, recipient: '+5585999999999' },
      { ...value, code: '1234' }, { ...value, text: 'arbitrary' }, { ...value, expires_at: new Date(nowMs).toISOString() },
      { ...value, expires_at: new Date(nowMs + 600_001).toISOString() }]) await assert.rejects(h.sender.send(bad));
    h.socket.ev.emit('connection.update', { connection: 'close' });
    await assert.rejects(h.sender.send(value));
  }, async () => { calls++; });
  await withHarness(async h => { assert.equal((await h.sender.send(input())).status, 'unknown'); }, async () => { calls++; }, () => nowMs, async () => []);
  assert.equal(calls, 0);
});

test('worker quota includes unknown sends, enforces cooldown and 3/hour across request IDs', async () => {
  let time = nowMs;
  await withHarness(async h => {
    await h.sender.send(input());
    await assert.rejects(h.sender.send(input()), /limit/);
    time += 60_001; await h.sender.send(input());
    time += 60_001; await h.sender.send(input());
    time += 60_001; await assert.rejects(h.sender.send(input()), /limit/);
  }, async () => { throw new Error('timeout'); }, () => time);
});

test('pending OTP survives reopen as unknown; ledger does not change original test records', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-otp-pending-'));
  let store;
  try {
    store = await openSessionStore({ directory, keyHex: env.WHATSAPP_QR_SESSION_KEY, initCredentials: () => ({}) });
    const id = randomUUID(), hash = 'a'.repeat(64), phoneHash = 'b'.repeat(64);
    await store.reserveTestSend(randomUUID(), 'c'.repeat(64));
    await store.reserveOtpSend(id, hash, phoneHash, nowMs);
    await store.close(); store = null;
    store = await openSessionStore({ directory, keyHex: env.WHATSAPP_QR_SESSION_KEY, initCredentials: () => ({}) });
    assert.deepEqual(await store.reserveOtpSend(id, hash, phoneHash, nowMs), { reserved: false, status: 'unknown' });
    assert.equal((await store.reserveTestSend(randomUUID(), 'c'.repeat(64))).reserved, false);
  } finally { await store?.close(); await rm(directory, { recursive: true, force: true }); }
});

test('HTTP OTP token cannot control session; control token cannot send OTP; browser/body restricted', async () => {
  await withHarness(async h => {
    const server = createControlServer(h.controller, env.WHATSAPP_QR_CONTROL_TOKEN, undefined, h.sender, env.WHATSAPP_QR_OTP_TOKEN);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`, body = JSON.stringify(input());
    const headers = { Authorization: `Bearer ${env.WHATSAPP_QR_OTP_TOKEN}`, 'Content-Type': 'application/json' };
    try {
      assert.equal((await fetch(base + '/session', { headers })).status, 401);
      assert.equal((await fetch(base + '/messages/otp', { method: 'POST', headers: { ...headers, Authorization: `Bearer ${env.WHATSAPP_QR_CONTROL_TOKEN}` }, body })).status, 401);
      assert.equal((await fetch(base + '/messages/otp', { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body })).status, 400);
      assert.equal((await fetch(base + '/messages/otp', { method: 'POST', headers, body: 'x'.repeat(513) })).status, 413);
      const result = await fetch(base + '/messages/otp', { method: 'POST', headers, body });
      assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await result.json(), { status: 'accepted', duplicate: false });
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  });
});
