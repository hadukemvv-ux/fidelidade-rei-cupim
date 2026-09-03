import assert from 'node:assert/strict';
import test from 'node:test';
import { buscarVendasSaipos, SaiposApiError } from '../src/lib/saipos.ts';

const periodo = {
  inicio: '2026-09-03T00:00:00.000Z',
  fim: '2026-09-03T23:59:59.000Z',
  token: 'token-de-teste',
  storeId: '62039',
  sleep: async () => {},
};

test('retenta PGRST003 e retorna vendas quando a Saipos se recupera', async () => {
  let chamadas = 0;
  const fetchImpl: typeof fetch = async () => {
    chamadas += 1;
    if (chamadas < 3) {
      return new Response(JSON.stringify({ code: 'PGRST003' }), { status: 504 });
    }
    return new Response(JSON.stringify([{ id_sale: 123 }]), { status: 200 });
  };

  const vendas = await buscarVendasSaipos({ ...periodo, fetchImpl });
  assert.equal(chamadas, 3);
  assert.deepEqual(vendas, [{ id_sale: 123 }]);
});

test('não retenta falha de autenticação', async () => {
  let chamadas = 0;
  const fetchImpl: typeof fetch = async () => {
    chamadas += 1;
    return new Response('Unauthorized', { status: 401 });
  };

  await assert.rejects(
    buscarVendasSaipos({ ...periodo, fetchImpl }),
    (error: unknown) => error instanceof SaiposApiError && error.status === 401 && error.tentativas === 1
  );
  assert.equal(chamadas, 1);
});

test('rejeita resposta autenticada em formato inesperado', async () => {
  let chamadas = 0;
  const fetchImpl: typeof fetch = async () => {
    chamadas += 1;
    return new Response(JSON.stringify({ vendas: [] }), { status: 200 });
  };

  await assert.rejects(
    buscarVendasSaipos({ ...periodo, fetchImpl }),
    (error: unknown) => error instanceof SaiposApiError && error.status === 502
  );
  assert.equal(chamadas, 1);
});
