import test from 'node:test';
import assert from 'node:assert/strict';
import { canConnect, createMemoryAuthState, privateSocketOptions, disconnectDecision,
  TEST_DURATION_MS } from './core.mjs';

test('só conecta manualmente, em terminal privado e com os três flags explícitos', () => {
  const flags = ['--connect', '--test-only', '--dedicated-number'];
  assert.equal(canConnect([], true), false);
  assert.equal(canConnect(flags, false), false);
  assert.equal(canConnect(flags.slice(0, 2), true), false);
  assert.equal(canConnect([...flags, '--send'], true), false);
  assert.equal(canConnect(['--connect', '--connect', '--test-only'], true), false);
  assert.equal(canConnect(flags, true), true);
  assert.equal(TEST_DURATION_MS, 300_000);
});

test('sem presença online, sincronização de histórico, leitura ou recuperação de mensagens', async () => {
  const auth = {};
  const logger = {};
  const config = privateSocketOptions(auth, logger);
  assert.equal(config.auth, auth);
  assert.equal(config.logger, logger);
  assert.equal(config.syncFullHistory, false);
  assert.equal(config.markOnlineOnConnect, false);
  assert.equal(config.shouldSyncHistoryMessage({}), false);
  assert.equal(config.shouldIgnoreJid('grupo@g.us'), true);
  assert.equal(config.shouldIgnoreJid('teste@s.whatsapp.net'), true);
  assert.equal(await config.getMessage({}), undefined);
});

test('credenciais e chaves ficam só em memória, separadas por tipo, sem serialização', async () => {
  const auth = createMemoryAuthState(() => ({ registered: false }));
  const key = { synthetic: true };
  await auth.state.keys.set({ session: { fixture: key }, identity: { fixture: { other: true } } });
  assert.equal((await auth.state.keys.get('session', ['fixture'])).fixture, key);
  auth.update({ registered: true });
  assert.equal(auth.state.creds.registered, true);
  await auth.state.keys.set({ session: { fixture: null } });
  assert.deepEqual(Object.keys(await auth.state.keys.get('session', ['fixture'])), []);
  auth.clear();
  assert.deepEqual(auth.state.creds, {});
  assert.deepEqual(Object.keys(await auth.state.keys.get('identity', ['fixture'])), []);
});

test('IDs externos não alteram protótipo do armazenamento', async () => {
  const auth = createMemoryAuthState(() => ({}));
  await auth.state.keys.set(JSON.parse('{"session":{"__proto__":{"fixture":true}}}'));
  const result = await auth.state.keys.get('session', ['__proto__']);
  assert.equal(Object.getPrototypeOf(result), null);
  assert.equal(result.__proto__.fixture, true);
  assert.equal({}.fixture, undefined);
});

test('só permite um reinício de pareamento; logout/falha não entram em loop', () => {
  assert.equal(disconnectDecision(515, 515, 0), 'restart');
  assert.equal(disconnectDecision(515, 515, 1), 'stop');
  for (const code of [undefined, 401, 403, 408, 500]) {
    assert.equal(disconnectDecision(code, 515, 0), 'stop');
  }
});
