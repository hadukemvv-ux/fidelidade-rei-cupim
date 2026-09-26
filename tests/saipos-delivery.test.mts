import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyDeliveryChannel, summarizeDelivery } from '../src/lib/saiposDelivery.ts';
import { buscarHistoricosStatusSaipos } from '../src/lib/saiposStatusHistory.ts';

test('separa marketplace, canal próprio identificado e origem incerta', () => {
  assert.equal(classifyDeliveryChannel({ partner_sale: { desc_store_partner: 'iFood' } }), 'marketplace');
  assert.equal(classifyDeliveryChannel({ partner_sale: { desc_store_partner: '99Food' } }), 'marketplace');
  assert.equal(classifyDeliveryChannel({ partner_sale: { desc_store_partner: 'Site Delivery Saipos' } }), 'proprio_identificado');
  assert.equal(classifyDeliveryChannel({ partner_sale: null }), 'sem_parceiro_informado');
  assert.equal(classifyDeliveryChannel({ partner_sale: { desc_store_partner: 'Outro parceiro' } }), 'parceiro_a_verificar');
});

test('resumo de entrega não transmite dados pessoais nem inventa prazo', () => {
  const result = summarizeDelivery({
    id_sale: 123, sale_number: 42, id_sale_type: 1, created_at: '2026-09-26T12:00:00Z',
    customer: { name: 'Cliente privado', phone: '85999999999' },
    delivery: { delivery_time: '', street: 'Rua privada', number: '10' },
    partner_sale: null,
  }, { histories: [{ desc_store_sale_status: 'Entregue', created_at: '2026-09-26T13:00:00Z', user: { email: 'privado@example.com' } }] });
  assert.equal(result.delivery_time, null);
  assert.equal(result.statuses[0].status, 'Entregue');
  assert.equal(JSON.stringify(result).includes('privado'), false);
});

test('histórico Saipos usa filtros documentados e não expõe token na URL', async () => {
  let calledUrl = '';
  let authorization = '';
  const result = await buscarHistoricosStatusSaipos({
    inicio: '2026-09-26T03:00:00.000Z', fim: '2026-09-27T02:59:59.999Z', token: 'segredo',
    fetchImpl: (async (url: string, init: RequestInit) => {
      calledUrl = url;
      authorization = String(new Headers(init.headers).get('Authorization'));
      return new Response(JSON.stringify([{ id_sale: 123, histories: [] }]), { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(result.complete, true);
  assert.equal(result.rows.length, 1);
  assert.match(calledUrl, /sales_status_histories/);
  assert.match(calledUrl, /p_date_column_filter=created_at/);
  assert.equal(calledUrl.includes('segredo'), false);
  assert.equal(authorization, 'Bearer segredo');
});
