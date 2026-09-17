import assert from 'node:assert/strict';
import test from 'node:test';
import { compararComandaComVenda } from '../src/lib/reconciliacaoComanda.ts';

test('reconcilia uma comanda apenas quando ID, total, pagamento e cancelamento conferem', () => {
  const resultado = compararComandaComVenda('872983789', 160.6, {
    id_sale: 872983789, total_amount: 160.6, canceled: 'N',
    updated_at: '2026-09-17T23:00:00Z', payments: [{ payment_amount: 160.6, desc_store_payment_type: 'Pagamento não cadastrado' }],
  } as never);
  assert.equal(resultado?.compativel, true);
  assert.equal(resultado?.detalhes.pagamento_total, 160.6);
});

test('marca divergência quando a venda é cancelada ou o total não confere', () => {
  const resultado = compararComandaComVenda('872918842', 138.6, {
    id_sale: 872918842, total_amount: 100, canceled: 'S', payments: [{ payment_amount: 100 }],
  } as never);
  assert.equal(resultado?.compativel, false);
  assert.match(resultado?.motivo || '', /cancelada/);
  assert.match(resultado?.motivo || '', /total/);
});

test('não reconcilia uma venda com identificador diferente', () => {
  assert.equal(compararComandaComVenda('872918842', 138.6, { id_sale: 1 } as never), null);
});
