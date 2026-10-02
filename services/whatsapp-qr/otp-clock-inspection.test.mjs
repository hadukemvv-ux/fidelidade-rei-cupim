import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectOtpClock } from './otp-clock-inspection.mjs';
import { openSessionStore } from './session-store.mjs';

const keyHex = 'ab'.repeat(32), hash = 'c'.repeat(64), phoneHash = 'd'.repeat(64);
const now = Date.parse('2026-10-01T12:00:00Z'), day = 86_400_000;
const config = directory => ({ directory, keyHex, initCredentials: () => ({ fixture: 'private-auth-fixture' }) });
const input = directory => ({ directory, keyHex, nowMs: now });

test('inspeção identifica salto futuro sem modificar sessão/ledgers nem revelar dados privados', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-clock-inspect-'));
  let store;
  try {
    store = await openSessionStore(config(directory));
    const id = randomUUID(); await store.reserveTestSend(randomUUID(), hash);
    await store.state.keys.set({ fixture: { key: 'private-key-fixture' } });
    await store.reserveOtpSend(id, hash, phoneHash, now + day);
    await store.close(); store = null;
    const before = await readFile(join(directory, 'session.enc'));
    const report = await inspectOtpClock(input(directory));
    assert.equal(report.status, 'clock_regressed'); assert.equal(report.future_reservations, 1);
    assert.equal(report.conservative_resume_after, new Date(now + 2 * day + 1).toISOString());
    for (const secret of [id, hash, phoneHash, 'private-auth-fixture', 'private-key-fixture']) assert.equal(JSON.stringify(report).includes(secret), false);
    assert.deepEqual(await readFile(join(directory, 'session.enc')), before);
    assert.equal((await inspectOtpClock({ ...input(directory), nowMs: now + day })).status, 'ok');
    store = await openSessionStore(config(directory));
    assert.equal((await store.reserveTestSend(randomUUID(), hash)).reserved, false);
    await assert.rejects(store.reserveOtpSend(randomUUID(), hash, phoneHash, now), /clock/);
    assert.equal((await store.reserveOtpSend(randomUUID(), hash, phoneHash, now + 2 * day + 1)).reserved, true);
    assert.equal(store.state.creds.fixture, 'private-auth-fixture');
    assert.equal((await store.state.keys.get('fixture', ['key'])).key, 'private-key-fixture');
  } finally { await store?.close(); await rm(directory, { recursive: true, force: true }); }
});
test('inspeção recusa lock ocupado e não remove o lock do worker', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-clock-lock-'));
  let store;
  try {
    store = await openSessionStore(config(directory)); await store.update({ registered: true });
    await assert.rejects(inspectOtpClock(input(directory)), /Inspection unavailable/);
    assert.ok((await stat(join(directory, 'session.lock'))).isFile());
    await store.close(); store = null;
    assert.equal((await inspectOtpClock(input(directory))).status, 'ok');
    await assert.rejects(stat(join(directory, 'session.lock')), { code: 'ENOENT' });
  } finally { await store?.close(); await rm(directory, { recursive: true, force: true }); }
});
test('chave errada ou sessão ausente falham sem reset/escrita nem lock abandonado', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cupim-clock-failure-'));
  let store;
  try {
    await assert.rejects(inspectOtpClock(input(directory)), /Inspection unavailable/);
    await assert.rejects(stat(join(directory, 'session.enc')), { code: 'ENOENT' });
    await assert.rejects(stat(join(directory, 'session.lock')), { code: 'ENOENT' });
    store = await openSessionStore(config(directory)); await store.update({ registered: true });
    await store.close(); store = null;
    const before = await readFile(join(directory, 'session.enc'));
    await assert.rejects(inspectOtpClock({ ...input(directory), keyHex: 'ef'.repeat(32) }), /Inspection unavailable/);
    assert.deepEqual(await readFile(join(directory, 'session.enc')), before);
    await assert.rejects(stat(join(directory, 'session.lock')), { code: 'ENOENT' });
    await assert.rejects(inspectOtpClock({ ...input(directory), nowMs: NaN }), /configuration/);
    await assert.rejects(inspectOtpClock({ ...input(directory), directory: '.' }), /configuration/);
  } finally { await store?.close(); await rm(directory, { recursive: true, force: true }); }
});
