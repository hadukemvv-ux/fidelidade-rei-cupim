import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openSessionStore } from './session-store.mjs';
import { createSessionController } from './session-controller.mjs';
import { createControlServer } from './http-server.mjs';
import { createTestSender, CONNECTION_TEST_TEXT } from './test-send.mjs';

const recipient = '+5585988887777'; // Fictional fixture, not the authorized live phone.
const env = { WHATSAPP_QR_SEND_MODE: 'test', WHATSAPP_QR_TEST_RECIPIENTS: recipient, WHATSAPP_QR_SESSION_KEY: 'ab'.repeat(32) };
async function harness(directory, sendMessage = async () => ({ key: { id: 'fixture-id' } }), config = env) {
  const store = await openSessionStore({ directory, keyHex: env.WHATSAPP_QR_SESSION_KEY, initCredentials: () => ({ registered: false }) });
  const socket = { ev: new EventEmitter(), sendMessage, end() {}, async logout() {} };
  const controller = createSessionController({ store, makeSocket: () => socket, restartRequired: 515, loggedOut: 401 });
  const sender = createTestSender({ env: config, store, controller, timeoutMs: 20 });
  await controller.command('connect');
  socket.ev.emit('connection.update', { connection: 'open' });
  return { store, socket, controller, sender };
}

test('test sender rejects default/commercial mode, empty list and malformed configuration', () => {
  for (const config of [{}, { ...env, WHATSAPP_QR_SEND_MODE: 'production' }, { ...env, WHATSAPP_QR_TEST_RECIPIENTS: '' }, { ...env, WHATSAPP_QR_TEST_RECIPIENTS: recipient + ',bad' }]) {
    assert.equal(createTestSender({ env: config }).enabled, false);
  }
});
test('one fixed message only, concurrent calls and new IDs cannot resend; ledger survives restart and unlink', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-send-test-'));
  let h, calls = 0;
  const send = async (jid, content) => {
    calls++;
    assert.equal(jid, '5585988887777@s.whatsapp.net');
    assert.deepEqual(content, { text: CONNECTION_TEST_TEXT });
    return { key: { id: 'fixture-id' } };
  };
  try {
    h = await harness(directory, send);
    const input = { request_id: randomUUID(), recipient };
    const [first, second] = await Promise.all([h.sender.send(input), h.sender.send(input)]);
    assert.deepEqual(first, { status: 'accepted', duplicate: false });
    assert.deepEqual(second, { status: 'accepted', duplicate: true });
    assert.equal((await h.sender.send({ ...input, request_id: randomUUID() })).duplicate, true);
    const bytes = await readFile(join(directory, 'session.enc'));
    assert.equal(bytes.includes(Buffer.from(recipient)), false);
    assert.equal(bytes.includes(Buffer.from(CONNECTION_TEST_TEXT)), false);
    await h.controller.command('disconnect');
    await h.controller.close(); h = null;
    h = await harness(directory, send);
    assert.equal((await h.sender.send({ ...input, request_id: randomUUID() })).duplicate, true);
    assert.equal(calls, 1);
  } finally { await h?.controller.close(); await rm(directory, { recursive: true, force: true }); }
});
test('network failure, empty response and timeout are unknown and cannot be retried after restart', async () => {
  for (const send of [async () => { throw new Error('private number/token'); }, async () => undefined, () => new Promise(() => {})]) {
    const directory = await mkdtemp(join(tmpdir(), 'cupim-unknown-test-'));
    let h, calls = 0;
    try {
      h = await harness(directory, (...args) => { calls++; return send(...args); });
      const input = { request_id: randomUUID(), recipient };
      assert.deepEqual(await h.sender.send(input), { status: 'unknown', duplicate: false });
      await h.controller.close(); h = null;
      h = await harness(directory, async () => { calls++; return { key: { id: 'unexpected' } }; });
      assert.deepEqual(await h.sender.send(input), { status: 'unknown', duplicate: true });
      assert.equal(calls, 1);
    } finally { await h?.controller.close(); await rm(directory, { recursive: true, force: true }); }
  }
});
test('wrong recipient, groups, free text and disconnected session never reserve/send', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-reject-test-'));
  let h, calls = 0;
  try {
    h = await harness(directory, async () => { calls++; });
    const input = { request_id: randomUUID(), recipient };
    for (const bad of [null, {}, { ...input, recipient: 'group@g.us' }, { ...input, recipient: '+5585999999999' }, { ...input, text: 'arbitrary' }, { ...input, request_id: 'bad' }]) {
      await assert.rejects(h.sender.send(bad), /Invalid test request/);
    }
    h.socket.ev.emit('connection.update', { connection: 'close' });
    await assert.rejects(h.sender.send(input), /Session unavailable/);
    assert.equal(calls, 0);
  } finally { await h?.controller.close(); await rm(directory, { recursive: true, force: true }); }
});
test('a persisted pending reservation fails closed across restart before any transport call', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-pending-test-'));
  let h;
  try {
    h = await harness(directory);
    const id = randomUUID(), hash = 'a'.repeat(64);
    assert.equal((await h.store.reserveTestSend(id, hash)).reserved, true);
    await h.controller.close(); h = null;
    h = await harness(directory);
    assert.deepEqual(await h.store.reserveTestSend(id, hash), { reserved: false, status: 'unknown' });
    await assert.rejects(h.store.reserveTestSend(id, 'b'.repeat(64)), /conflict/);
  } finally { await h?.controller.close(); await rm(directory, { recursive: true, force: true }); }
});
test('HTTP test route is authenticated, rejects browser origins, oversized bodies and unsupported payloads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-http-send-test-'));
  const h = await harness(directory);
  const token = 'cd'.repeat(32), server = createControlServer(h.controller, token, h.sender);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/messages/test`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const body = JSON.stringify({ request_id: randomUUID(), recipient });
  try {
    assert.equal((await fetch(url, { method: 'POST', body })).status, 401);
    assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, Origin: 'https://example.test' }, body })).status, 400);
    assert.equal((await fetch(url, { method: 'POST', headers, body: 'x'.repeat(513) })).status, 413);
    assert.equal((await fetch(url, { method: 'POST', headers, body: '{' })).status, 400);
    const response = await fetch(url, { method: 'POST', headers, body });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { status: 'accepted', duplicate: false });
  } finally { await h.controller.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
});
