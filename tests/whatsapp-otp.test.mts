import assert from 'node:assert/strict';
import test from 'node:test';

import { isPhoneInBetaList, normalizeBrazilPhone, privateIdentifier } from '../src/lib/otpCore.ts';

test('normaliza telefone brasileiro local e E.164', () => {
  assert.deepEqual(normalizeBrazilPhone('(85) 98888-7777'), { local: '85988887777', e164: '+5585988887777' });
  assert.deepEqual(normalizeBrazilPhone('+55 85 98888-7777'), { local: '85988887777', e164: '+5585988887777' });
  assert.throws(() => normalizeBrazilPhone('123'));
});

test('identificadores privados são estáveis e não expõem o valor', () => {
  const first = privateIdentifier('phone:+5585988887777', 'test-secret');
  assert.equal(first, privateIdentifier('phone:+5585988887777', 'test-secret'));
  assert.notEqual(first, privateIdentifier('phone:+5585988887778', 'test-secret'));
  assert.equal(first.includes('85988887777'), false);
});

test('modo beta bloqueia por padrão e libera somente a lista', () => {
  const list = '85988887777,+55 85 97777-6666';
  assert.equal(isPhoneInBetaList('85988887777', list), true);
  assert.equal(isPhoneInBetaList('85999990000', list), false);
  assert.equal(isPhoneInBetaList('85999990000', list, false), true);
});
