import test from 'node:test';
import assert from 'node:assert/strict';
import { canAttemptDeliveryAction, canChangeDelivery, canReadDelivery, deliveryAlert, deliveryDailySummary, deliveryDay, deliveryLedgerEnabled, type DeliveryRecord } from '../src/lib/prizeDeliveryLedger.ts';
import { changeDelivery, deliveryIdBatches, listDeliveries, type DeliveryStore } from '../src/lib/prizeDeliveryHandlers.ts';

const deliveryId = '10000000-0000-4000-8000-000000000001';
const productId = '20000000-0000-4000-8000-000000000001';
const actor = { userId: 'garcom-a', papel: 'garcom' as const };
const now = new Date('2026-09-29T03:00:00Z');
function sample(patch: Partial<DeliveryRecord> = {}): DeliveryRecord {
  return { id: deliveryId, operador_id: actor.userId, modo_teste: false, status: 'pendente', versao: 0,
    criado_em: '2026-09-25T03:00:00Z', entregue_em: null, lancado_em: null,
    produto_id: null, produto_nome: null, unidade: null, quantidade: 2, ...patch };
}
function request(body: unknown) {
  return new Request('https://example.test/api/operacional/entregas', { method: 'POST', body: JSON.stringify(body) });
}
function store(overrides: Partial<DeliveryStore> = {}): DeliveryStore {
  return { list: async () => [sample()], options: async () => [], mutate: async () => ({ ok: true, entrega_id: deliveryId, versao: 1 }), ...overrides };
}

test('ledger real começa desligado e só aceita habilitação explícita', () => {
  for (const value of [undefined, 'false', 'TRUE', '1', 'production']) assert.equal(deliveryLedgerEnabled({ PRIZE_DELIVERY_LEDGER_ENABLED: value }), false);
  assert.equal(deliveryLedgerEnabled({ PRIZE_DELIVERY_LEDGER_ENABLED: 'true' }), true);
});
test('garçom lê só próprias entregas e gestor não escreve', () => {
  assert.equal(canReadDelivery('garcom', 'a', 'b'), false);
  assert.equal(canReadDelivery('garcom', 'a', null), false);
  assert.equal(canReadDelivery('garcom', 'a', 'a'), true);
  assert.equal(canReadDelivery('gestor', 'a', 'b'), true);
  for (const action of ['selecionar', 'entregar', 'lancar'] as const) assert.equal(canChangeDelivery('gestor', 'a', 'a', action), false);
});
test('entrega pertence ao garçom responsável; caixa só registra lançamento', () => {
  assert.equal(canChangeDelivery('garcom', 'a', 'b', 'entregar'), false);
  assert.equal(canChangeDelivery('garcom', 'a', 'a', 'entregar'), true);
  assert.equal(canChangeDelivery('garcom', 'a', 'a', 'lancar'), false);
  assert.equal(canChangeDelivery('caixa', 'a', 'b', 'lancar'), true);
  assert.equal(canChangeDelivery('caixa', 'a', 'b', 'entregar'), false);
});
test('API só pré-checa o papel; SQL decide o dono real', () => {
  assert.equal(canAttemptDeliveryAction('garcom', 'entregar'), true);
  assert.equal(canAttemptDeliveryAction('garcom', 'lancar'), false);
  assert.equal(canAttemptDeliveryAction('caixa', 'entregar'), false);
  assert.equal(canAttemptDeliveryAction('caixa', 'lancar'), true);
  assert.equal(canAttemptDeliveryAction('gestor', 'entregar'), false);
  assert.equal(canChangeDelivery('garcom', 'garcom-a', 'garcom-b', 'entregar'), false);
});
test('opções são consultadas em lotes conservadores para evitar URL 414', () => {
  assert.deepEqual(deliveryIdBatches([]), []);
  const ids = Array.from({ length: 500 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
  const batches = deliveryIdBatches(ids);
  assert.equal(batches.length, 7);
  assert.equal(Math.max(...batches.map((batch) => batch.length)), 75);
  assert.deepEqual(batches.flat(), ids);
});
test('seleção e ensaio não somam no fechamento físico', () => {
  assert.deepEqual(deliveryDailySummary([sample({ status: 'selecionada', produto_id: productId }), sample({ status: 'bloqueada' }), sample({ modo_teste: true, status: 'entregue', entregue_em: now.toISOString(), produto_id: productId, produto_nome: 'Item fictício', unidade: 'unidade' })]), []);
});
test('resumo usa data da entrega em Fortaleza e soma quantidade, não número de cupons', () => {
  const record = sample({ status: 'entregue', entregue_em: '2026-09-29T02:59:59Z', produto_id: productId, produto_nome: 'Item fictício', unidade: 'garrafa 600 ml' });
  assert.deepEqual(deliveryDailySummary([record, { ...record, id: 'outro', quantidade: 1, lancado_em: now.toISOString() }]), [{ dia: '2026-09-28', produto_id: productId, produto_nome: 'Item fictício', unidade: 'garrafa 600 ml', entregues: 3, lancados: 1 }]);
  assert.equal(deliveryDay('2026-09-29T03:00:00Z'), '2026-09-29');
  assert.throws(() => deliveryDay('data inválida'));
});
test('72 horas geram alerta sem apagar, entregar ou lançar', () => {
  const record = sample();
  assert.equal(deliveryAlert(record, now), true);
  assert.equal(record.status, 'pendente');
  assert.equal(deliveryAlert({ ...record, lancado_em: now.toISOString() }, now), false);
});
test('lista filtra dono antes de carregar opções e retorna no-store', async () => {
  let ids: string[] = [];
  const response = await listDeliveries(actor, store({ list: async () => [sample(), sample({ id: 'outro', operador_id: 'garcom-b' })], options: async (values) => { ids = values; return [{ entrega_id: deliveryId, produto_id: productId, nome: 'Fictício', unidade: 'unidade' }]; } }), now);
  assert.deepEqual(ids, [deliveryId]);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.entregas.length, 1);
  assert.equal(body.entregas[0].opcoes.length, 1);
  assert.equal(body.entregas[0].alerta_72h, true);
});
test('falha de opções ou consulta fecha lista, sem resumo parcial', async () => {
  for (const source of ['list', 'options'] as const) {
    const response = await listDeliveries(actor, store({ [source]: async () => { throw new Error('detalhe privado'); } }), now);
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes('privado'), false);
  }
});
test('comandos rejeitam quantidade, ator, produto inválido e versão inválida enviados pelo cliente', async () => {
  let calls = 0;
  const dependency = store({ mutate: async () => { calls++; return { ok: true }; } });
  const valid = { entrega_id: deliveryId, acao: 'selecionar', versao: 0, produto_id: productId };
  for (const body of [{ ...valid, quantidade: 99 }, { ...valid, actor_id: 'superadmin' }, { ...valid, versao: -1 }, { ...valid, produto_id: 'inventado' }, { ...valid, produto_id: undefined }, { ...valid, acao: 'entregar' }]) {
    assert.equal((await changeDelivery(request(body), actor, dependency)).status, 400);
  }
  assert.equal(calls, 0);
});
test('gestor e caixa não conseguem confirmar entrega pela API', async () => {
  let calls = 0;
  const dependency = store({ mutate: async () => { calls++; return { ok: true }; } });
  for (const papel of ['gestor', 'caixa'] as const) assert.equal((await changeDelivery(request({ entrega_id: deliveryId, acao: 'entregar', versao: 1 }), { ...actor, papel }, dependency)).status, 403);
  assert.equal(calls, 0);
});
test('API encaminha ator autenticado e versão; SQL continua autoridade sobre dono e duplicidade', async () => {
  let captured: unknown;
  const response = await changeDelivery(request({ entrega_id: deliveryId, acao: 'selecionar', versao: 0, produto_id: productId }), actor, store({ mutate: async (input) => { captured = input; return { ok: true, versao: 1 }; } }));
  assert.equal(response.status, 200);
  assert.deepEqual(captured, { entregaId: deliveryId, actor, acao: 'selecionar', versao: 0, produtoId: productId });
});
test('versão obsoleta ou operador sem permissão no SQL viram conflito; resultado incerto não retenta', async () => {
  const body = { entrega_id: deliveryId, acao: 'entregar', versao: 1 };
  assert.equal((await changeDelivery(request(body), actor, store({ mutate: async () => ({ ok: false, motivo: 'Atualize a lista.' }) }))).status, 409);
  let calls = 0;
  const response = await changeDelivery(request(body), actor, store({ mutate: async () => { calls++; throw new Error('segredo'); } }));
  assert.equal(response.status, 503);
  assert.equal(calls, 1);
  assert.equal((await response.text()).includes('segredo'), false);
});
