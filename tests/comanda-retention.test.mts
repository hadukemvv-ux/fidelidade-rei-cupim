import assert from 'node:assert/strict';
import test from 'node:test';
import { caminhosDaComanda, dataExpiracaoComanda, RETENCAO_COMANDA_HORAS } from '../src/lib/comandaRetention.ts';

test('expira a evidência da comanda após 36 horas', () => {
  const inicio = new Date('2026-09-22T13:39:00.000Z');
  assert.equal(dataExpiracaoComanda(inicio).toISOString(), '2026-09-24T01:39:00.000Z');
  assert.equal(RETENCAO_COMANDA_HORAS, 36);
});

test('remove cada caminho privado uma única vez', () => {
  assert.deepEqual(
    caminhosDaComanda('2026-09-22/a-cabecalho.jpg', [
      { imagem_path: '2026-09-22/a-cabecalho.jpg' },
      { imagem_path: '2026-09-22/a-total.jpg' },
    ]),
    ['2026-09-22/a-cabecalho.jpg', '2026-09-22/a-total.jpg'],
  );
});
