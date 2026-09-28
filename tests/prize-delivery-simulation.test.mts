import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSummary, demoTransition, type DemoDelivery } from '../src/lib/prizeDeliverySimulation.ts';
import { deliveryOverdue } from '../src/lib/prizeDeliveryRules.ts';

const now = new Date('2026-09-28T02:00:00Z');
function sample(): DemoDelivery { return { id: 'demo', prize: 'expulsadeira', createdAt: '2026-09-27T20:00:00Z', status: 'pendente', consumedBeerIds: ['beer-a'], events: [] }; }
function delivered() { return demoTransition(demoTransition(sample(), { type: 'select', productId: 'beer-a' }, now), { type: 'deliver' }, now); }
test('escolha não é entrega e mantém o registro original intacto', () => {
  const original = sample();
  const selected = demoTransition(original, { type: 'select', productId: 'beer-a' }, now);
  assert.equal(selected.status, 'selecionada');
  assert.deepEqual(demoSummary([selected]), []);
  assert.equal(original.status, 'pendente');
  assert.equal(original.events.length, 0);
});
test('não aceita cerveja não consumida nem baixa antes da entrega', () => {
  assert.throws(() => demoTransition(sample(), { type: 'select', productId: 'beer-b' }, now));
  assert.throws(() => demoTransition(sample(), { type: 'deliver' }, now));
  assert.throws(() => demoTransition(sample(), { type: 'post' }, now));
});
test('expulsadeira entrega duas unidades e bloqueia entrega duplicada', () => {
  const record = delivered();
  assert.equal(record.delivery?.quantidade, 2);
  assert.throws(() => demoTransition(record, { type: 'deliver' }, now));
  assert.throws(() => demoTransition(record, { type: 'select', productId: 'beer-a' }, now));
  assert.throws(() => demoTransition(record, { type: 'cancel' }, now));
});
test('baixa manual simulada é única e distinta da entrega', () => {
  const record = delivered();
  const posted = demoTransition(record, { type: 'post' }, now);
  assert.equal(demoSummary([record])[0].posted, 0);
  assert.equal(demoSummary([posted])[0].posted, 2);
  assert.throws(() => demoTransition(posted, { type: 'post' }, now));
  assert.equal(posted.events.length, 3);
});
test('resumo soma itens e usa dia da entrega em Fortaleza', () => {
  const record = delivered();
  const summary = demoSummary([record, { ...record, id: 'second' }]);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].day, '27/09/2026');
  assert.equal(summary[0].delivered, 4);
});
test('cancelamento e pendência de 72h não geram saídas', () => {
  const original = sample();
  const cancelled = demoTransition(original, { type: 'cancel' }, now);
  assert.deepEqual(demoSummary([cancelled]), []);
  assert.throws(() => demoTransition(cancelled, { type: 'select', productId: 'beer-a' }, now));
  assert.equal(deliveryOverdue(original.createdAt, new Date('2026-10-01T00:00:00Z')), true);
  assert.equal(original.status, 'pendente');
});
test('sobremesa permite opção exata e entrega uma unidade', () => {
  const record = { ...sample(), prize: 'sobremesa' as const };
  const result = demoTransition(demoTransition(record, { type: 'select', productId: 'pudim' }, now), { type: 'deliver' }, now);
  assert.equal(result.delivery?.produto_nome, 'Pudim');
  assert.equal(result.delivery?.quantidade, 1);
  assert.equal(result.delivery?.unidade, 'fatia');
});
