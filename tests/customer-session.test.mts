import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCustomerSessionToken,
  readCustomerSessionToken,
} from '../src/lib/customerSession.ts';

process.env.CUSTOMER_SESSION_SECRET = 'test-only-secret-with-enough-entropy';

test('cria e valida uma sessão vinculada ao telefone', () => {
  const token = createCustomerSessionToken('(11) 99999-0000');
  assert.equal(readCustomerSessionToken(token)?.phone, '11999990000');
});

test('rejeita sessão adulterada', () => {
  const token = createCustomerSessionToken('11999990000');
  const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
  assert.equal(readCustomerSessionToken(tampered), null);
});

test('rejeita sessão expirada', () => {
  const token = createCustomerSessionToken('11999990000', Date.now() - 1);
  assert.equal(readCustomerSessionToken(token), null);
});
