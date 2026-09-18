import assert from 'node:assert/strict';
import test from 'node:test';
import { extrairDadosDaComanda, validarLeituraParaPiloto } from '../src/lib/comandaOcr.ts';

test('extrai sugestões da comanda Saipos sem transformar OCR em confirmação', () => {
  const leitura = extrairDadosDaComanda(`SALAO\nMesa: 99 - Garcom: Junior\n17/set - 12:44\nTempo: 3h23m\nID do Pedido:872482756\nTOTAL(=)\n274,45\nPagamento nao cadastrado`, 2026);
  assert.equal(leitura.mesa, '99');
  assert.equal(leitura.data_operacional, '2026-09-17');
  assert.equal(leitura.horario_abertura, '12:44');
  assert.equal(leitura.id_pedido_impresso, '872482756');
  assert.equal(leitura.valor_confirmado, '274,45');
  assert.deepEqual(validarLeituraParaPiloto(leitura), { pronta: true, camposAusentes: [] });
});

test('permite revisão humana quando o OCR não encontra os campos', () => {
  const leitura = extrairDadosDaComanda('foto desfocada', 2026);
  assert.equal(leitura.mesa, undefined);
  assert.equal(leitura.id_pedido_impresso, undefined);
  assert.deepEqual(validarLeituraParaPiloto(leitura), {
    pronta: false,
    camposAusentes: ['mesa', 'data de abertura', 'horário de abertura', 'ID do pedido', 'valor total'],
  });
});
