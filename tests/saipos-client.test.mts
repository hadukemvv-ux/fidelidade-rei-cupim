import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buscarTodasVendasSaipos,
  buscarVendasSaipos,
  periodoDiaSaoPaulo,
  periodoUltimosDiasSaoPaulo,
  SaiposApiError,
} from '../src/lib/saipos.ts';

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

test('pagina até receber um lote menor que o limite', async () => {
  const offsets: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(String(input));
    const offset = url.searchParams.get('p_offset') || '';
    offsets.push(offset);
    const lote = offset === '0'
      ? [{ id_sale: 1 }, { id_sale: 2 }]
      : [{ id_sale: 3 }];
    return new Response(JSON.stringify(lote), { status: 200 });
  };

  const vendas = await buscarTodasVendasSaipos({
    ...periodo,
    pageSize: 2,
    fetchImpl,
  });

  assert.deepEqual(offsets, ['0', '2']);
  assert.deepEqual(vendas.map((venda) => venda.id_sale), [1, 2, 3]);
});

test('calcula dias civis no horário de São Paulo', () => {
  assert.deepEqual(periodoDiaSaoPaulo('2026-09-03'), {
    inicio: '2026-09-03T03:00:00.000Z',
    fim: '2026-09-04T02:59:59.999Z',
  });
  assert.deepEqual(periodoUltimosDiasSaoPaulo(3, new Date('2026-09-03T12:00:00.000Z')), {
    inicio: '2026-09-01T03:00:00.000Z',
    fim: '2026-09-04T02:59:59.999Z',
  });
});

test('rejeita datas e intervalos fora do limite seguro', () => {
  assert.throws(() => periodoDiaSaoPaulo('2026-02-30'));
  assert.throws(() => periodoUltimosDiasSaoPaulo(0));
  assert.throws(() => periodoUltimosDiasSaoPaulo(91));
});
