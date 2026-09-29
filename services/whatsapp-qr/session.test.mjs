import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { openSessionStore } from './session-store.mjs';
import { createSessionController } from './session-controller.mjs';
import { createControlServer } from './http-server.mjs';

test('encrypted session survives restart, locks a second worker and rejects a wrong key or corruption', async () => {
  const { BufferJSON } = await import('@whiskeysockets/baileys');
  const directory = await mkdtemp(join(tmpdir(), 'cupim-session-test-'));
  const options = { directory, keyHex: 'ab'.repeat(32), initCredentials: () => ({ registered: false }), codec: BufferJSON };
  let store;
  try {
    store = await openSessionStore(options);
    await assert.rejects(openSessionStore(options));
    await Promise.all([store.update({ secret: 'private-fixture', registered: true, binary: Buffer.from([1, 2, 3]) }), store.state.keys.set({ session: { test: { secret: 'key-fixture' } } })]);
    const bytes = await readFile(join(directory, 'session.enc'));
    assert.equal(bytes.includes(Buffer.from('private-fixture')), false);
    assert.equal(bytes.includes(Buffer.from('key-fixture')), false);
    await store.close(); store = null;
    await assert.rejects(openSessionStore({ ...options, keyHex: 'cd'.repeat(32) }));
    store = await openSessionStore(options);
    assert.equal(store.state.creds.secret, 'private-fixture');
    assert.deepEqual(store.state.creds.binary, Buffer.from([1, 2, 3]));
    assert.equal((await store.state.keys.get('session', ['test'])).test.secret, 'key-fixture');
    await store.state.keys.set({ session: { test: null } });
    assert.deepEqual(Object.keys(await store.state.keys.get('session', ['test'])), []);
    await store.clear();
    await store.close(); store = null;
    store = await openSessionStore(options);
    assert.equal(store.state.creds.registered, false);
    assert.equal(store.state.creds.secret, undefined);
    await store.close(); store = null;
    bytes[bytes.length - 1] ^= 1;
    await writeFile(join(directory, 'session.enc'), bytes);
    await assert.rejects(openSessionStore(options));
  } finally { await store?.close(); await rm(directory, { recursive: true, force: true }); }
});

function harness() {
  const sockets = [];
  let time = 0, cleared = 0, closed = 0;
  const store = { state: { creds: {} }, update: async (value) => Object.assign(store.state.creds, value),
    clear: async () => { cleared++; store.state.creds = {}; }, close: async () => { closed++; } };
  const controller = createSessionController({ store, restartRequired: 515, loggedOut: 401, now: () => time,
    makeSocket: () => {
      const socket = { ev: new EventEmitter(), end: () => {}, logout: async () => {} };
      sockets.push(socket); return socket;
    } });
  return { controller, sockets, store, tick: (value) => { time = value; }, counts: () => ({ cleared, closed }) };
}

test('concurrent connects open one socket; QR expires and disappears after pairing; shutdown preserves session', async () => {
  const h = harness();
  await Promise.all([h.controller.command('connect'), h.controller.command('connect')]);
  assert.equal(h.sockets.length, 1);
  h.sockets[0].ev.emit('connection.update', { qr: 'qr-fixture' });
  assert.equal(h.controller.snapshot().qr, 'qr-fixture');
  h.tick(40_001);
  assert.equal(h.controller.snapshot().qr, null);
  h.sockets[0].ev.emit('connection.update', { qr: 'new-qr-fixture' });
  h.sockets[0].ev.emit('connection.update', { connection: 'open' });
  assert.equal(h.controller.snapshot().status, 'connected');
  assert.equal(h.controller.snapshot().qr, null);
  await h.controller.close();
  assert.deepEqual(h.counts(), { cleared: 0, closed: 1 });
});

test('protocol restart is bounded; events from replaced sockets cannot expose an old QR', async () => {
  const h = harness();
  await h.controller.command('connect');
  const restart = { connection: 'close', lastDisconnect: { error: { output: { statusCode: 515 } } } };
  h.sockets[0].ev.emit('connection.update', restart);
  assert.equal(h.sockets.length, 2);
  h.sockets[0].ev.emit('connection.update', { qr: 'stale' });
  assert.equal(h.controller.snapshot().qr, null);
  h.sockets[1].ev.emit('connection.update', restart);
  assert.equal(h.sockets.length, 2);
  assert.equal(h.controller.snapshot().status, 'disconnected');
  await h.controller.close();
});

test('uncertain logout preserves credentials and fails closed', async () => {
  const h = harness();
  await h.controller.command('connect');
  h.store.state.creds.registered = true;
  h.sockets[0].ev.emit('connection.update', { connection: 'open' });
  h.sockets[0].logout = async () => { throw new Error('private upstream detail'); };
  await assert.rejects(h.controller.command('disconnect'), /Could not confirm unlink/);
  assert.equal(h.counts().cleared, 0);
  assert.equal(h.controller.snapshot().status, 'error');
  await assert.rejects(h.controller.command('connect'));
  await h.controller.close();
});

test('successful unlink clears saved session exactly once', async () => {
  const h = harness();
  await h.controller.command('connect');
  h.store.state.creds.registered = true;
  h.sockets[0].ev.emit('connection.update', { connection: 'open' });
  await h.controller.command('disconnect');
  assert.equal(h.counts().cleared, 1);
  assert.equal(h.controller.snapshot().status, 'disconnected');
  await h.controller.close();
});

test('real local HTTP boundary requires bearer auth, rejects browser origins, hides errors and never caches QR', async () => {
  const h = harness();
  const token = 'ab'.repeat(32);
  const server = createControlServer(h.controller, token);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    assert.equal((await fetch(`${url}/session`)).status, 401);
    assert.equal((await fetch(`${url}/session`, { headers: { ...headers, Origin: 'https://untrusted.test' } })).status, 400);
    assert.equal((await fetch(`${url}/session/connect`, { method: 'POST', headers })).status, 200);
    h.sockets[0].ev.emit('connection.update', { qr: 'qr-test-only' });
    const response = await fetch(`${url}/session`, { headers });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).qr, 'qr-test-only');
    assert.equal((await fetch(`${url}/send`, { method: 'POST', headers })).status, 404);
  } finally { await h.controller.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
