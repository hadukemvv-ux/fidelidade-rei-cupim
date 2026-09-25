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

test('prioriza o TOTAL (=) final, e não o subtotal de itens da comanda Saipos', () => {
  const leitura = extrairDadosDaComanda(`SALAO
Mesa: 200 - Garcom: Vinicius
22/set - 13:39
ID do Pedido:878519537
Quantidade de itens: 20
Total itens(=) 200,00
Taxa de servico(+) 20,00
Acrescimo(+) 0,00
Desconto(-) 0,00
TOTAL (=)
220,00
Pagamento nao cadastrado`, 2026);
  assert.equal(leitura.valor_confirmado, '220,00');
  assert.deepEqual(validarLeituraParaPiloto(leitura), { pronta: true, camposAusentes: [] });
});

test('interpreta a leitura da foto real com sombra após correção local', () => {
  const leitura = extrairDadosDaComanda(`RAS: 22/set - 13:39
Mesa: 200 - Garcom: Teste
Tempo: Ohom
ID do Pedido:878519537
Total] itens(=) 200,00
Taxa de servico(+) 20,00
Acrescimo(+) 0,00
Desconto(-) 0,00
TOTAL(=) 220,00`, 2026);
  assert.equal(leitura.mesa, '200');
  assert.equal(leitura.data_operacional, '2026-09-22');
  assert.equal(leitura.horario_abertura, '13:39');
  assert.equal(leitura.id_pedido_impresso, '878519537');
  assert.equal(leitura.valor_confirmado, '220,00');
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
