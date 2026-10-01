import test from 'node:test';
import assert from 'node:assert/strict';
import { PrizeUpdateSchema, updatePrize, type PrizeUpdateStore } from '../src/lib/prizeUpdate.ts';

const actor = { userId: '00000000-0000-4000-8000-000000000001', papel: 'superadmin' };
const request = (body: unknown) => new Request('https://clubecupim.example/api/admin/premios', { method: 'PUT', body: JSON.stringify(body) });

test('edição valida nome e descrição, normaliza espaços e permite limpar mensagem', () => {
  assert.deepEqual(PrizeUpdateSchema.parse({ id: '1', nome: '  Saideira 🍺  ', descricao_vitoria: '  Você ganhou!\nEscolha a cerveja. ' }),
    { id: 1, nome: 'Saideira 🍺', descricao_vitoria: 'Você ganhou!\nEscolha a cerveja.' });
  for (const value of [null, '', '   ']) assert.equal(PrizeUpdateSchema.parse({ id: 1, descricao_vitoria: value }).descricao_vitoria, null);
  assert.equal(PrizeUpdateSchema.parse({ id: 1, nome: 'x'.repeat(255), descricao_vitoria: 'x'.repeat(500) }).nome?.length, 255);
  for (const body of [{ id: 1 }, { id: true, nome: 'x' }, { id: 1, nome: ' ' }, { id: 1, nome: null },
    { id: 1, nome: 'x'.repeat(256) }, { id: 1, descricao_vitoria: 'x'.repeat(501) }, { id: 1, nome: 'x\ny' },
    { id: 1, descricao_vitoria: 'x\u0000y' }, { id: 1, imagem_url: '/forged.webp' }, { id: 1, actor_id: actor.userId },
    { id: 1, codigo: 'forged' }, { id: 1, tipo: 'expulsadeira' }, { id: 1, valor: null }]) {
    assert.equal(PrizeUpdateSchema.safeParse(body).success, false, JSON.stringify(body));
  }
});
test('PATCH via PUT omite campos não enviados; ator da sessão e textos vão à transação', async () => {
  let calls = 0;
  const result = await updatePrize(request({ id: 1, nome: 'Novo nome', descricao_vitoria: 'Boa!' }), actor, {
    async commit(input) {
      calls++; assert.deepEqual(input, { prizeId: 1, actorId: actor.userId, changes: { nome: 'Novo nome', descricao_vitoria: 'Boa!' } });
      return { ok: true, premio: { id: 1, nome: 'Novo nome', descricao_vitoria: 'Boa!', ativo: false } };
    },
  });
  assert.equal(calls, 1); assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal((await result.json()).data.premio.nome, 'Novo nome');
});
test('permissão/origem e entradas inválidas não chamam RPC', async () => {
  let calls = 0; const store: PrizeUpdateStore = { commit: async () => { calls++; return { ok: true }; } };
  assert.equal((await updatePrize(request({ id: 1, nome: 'x' }), { ...actor, papel: 'gestor' }, store)).status, 403);
  const cross = request({ id: 1, nome: 'x' }); cross.headers.set('origin', 'https://evil.example');
  assert.equal((await updatePrize(cross, actor, store)).status, 403);
  assert.equal((await updatePrize(request({ id: 1, descricao_vitoria: false }), actor, store)).status, 400);
  assert.equal((await updatePrize(new Request('https://clubecupim.example', { method: 'PUT', body: '{broken' }), actor, store)).status, 400);
  assert.equal(calls, 0);
});
test('resposta do banco respeita bloqueios; falha/timeout não divulga segredo nem retenta', async () => {
  for (const [code, status] of [['forbidden',403],['not_found',404],['paused',409],['pilot',409],['invalid',400]] as const) {
    assert.equal((await updatePrize(request({ id: 1, nome: 'x' }), actor, { commit: async () => ({ ok: false, code, motivo: 'Bloqueado.' }) })).status, status);
  }
  let calls = 0;
  const result = await updatePrize(request({ id: 1, nome: 'x' }), actor, { commit: async () => { calls++; throw new Error('private token'); } });
  assert.equal(result.status, 503); assert.equal(calls, 1); assert.equal((await result.text()).includes('private token'), false);
});
