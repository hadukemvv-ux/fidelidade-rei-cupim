import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isPreCadastro } from '../src/lib/customerRegistration.ts';

test('email ausente não impede conta com nome e PIN seguro', () => {
  assert.equal(isPreCadastro({ nome: 'Cliente Teste', telefone: '85999999999', pin_hash: 'scrypt$16384$8$1$c2FsdA$aGFzaA' }), false);
});

test('cadastro sem PIN ou vindo da roleta continua incompleto', () => {
  assert.equal(isPreCadastro({ nome: 'Cliente Teste', telefone: '85999999999', pin_hash: null }), true);
  assert.equal(isPreCadastro({ nome: 'Cliente Novo (Roleta)', telefone: '85999999999', pin_hash: 'hash' }), true);
});

test('PIN automático legado continua exigindo conclusão segura', () => {
  const telefone = '85987654321';
  const pin_hash = createHash('sha256').update(telefone.slice(0, 4)).digest('hex');
  assert.equal(isPreCadastro({ nome: 'Cliente Teste', telefone, pin_hash }), true);
});
