import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { hashPin, isLegacyAutomaticPin, verifyPin } from '../src/lib/pin.ts';

test('gera hashes diferentes para o mesmo PIN e valida ambos', async () => {
  const first = await hashPin('4827');
  const second = await hashPin('4827');
  assert.notEqual(first, second);
  assert.equal((await verifyPin('4827', first)).valid, true);
  assert.equal((await verifyPin('4827', second)).valid, true);
  assert.equal((await verifyPin('0000', first)).valid, false);
});

test('aceita SHA-256 legado apenas para migração', async () => {
  const legacy = createHash('sha256').update('4827').digest('hex');
  assert.deepEqual(await verifyPin('4827', legacy), { valid: true, needsRehash: true });
  assert.equal((await verifyPin('4826', legacy)).valid, false);
});

test('detecta PIN automático legado da roleta', () => {
  const automatic = createHash('sha256').update('8598').digest('hex');
  assert.equal(isLegacyAutomaticPin('85988887777', automatic), true);
  assert.equal(isLegacyAutomaticPin('85988887777', createHash('sha256').update('1234').digest('hex')), false);
});

test('rejeita PIN e hash malformados', async () => {
  await assert.rejects(hashPin('12345'));
  assert.equal((await verifyPin('1234', 'scrypt$ruim')).valid, false);
  assert.equal((await verifyPin('abcd', null)).valid, false);
});
