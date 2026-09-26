import assert from 'node:assert/strict';
import test from 'node:test';
import { atualizarDigitosDeMoeda, formatarCentavos, normalizarDigitosDeMoeda } from '../src/lib/currencyInput.ts';

test('os números digitados avançam automaticamente os centavos', () => {
  assert.equal(formatarCentavos('1'), '0,01');
  assert.equal(formatarCentavos('12'), '0,12');
  assert.equal(formatarCentavos('123'), '1,23');
  assert.equal(formatarCentavos('25916'), '259,16');
  assert.equal(formatarCentavos('123456'), '1.234,56');

  let digitos = '';
  for (const entrada of ['2', '0,022', '0,220', '2,200']) {
    digitos = atualizarDigitosDeMoeda(digitos, entrada, 'insertText');
  }
  assert.equal(digitos, '2200');
  assert.equal(formatarCentavos(digitos), '22,00');
});

test('aceita colagem formatada e permite apagar até limpar o campo', () => {
  assert.equal(normalizarDigitosDeMoeda('R$ 1.234,56'), '123456');
  assert.equal(atualizarDigitosDeMoeda('25916', '259,1', 'deleteContentBackward'), '2591');
  assert.equal(atualizarDigitosDeMoeda('1', '0,0', 'deleteContentBackward'), '');
  assert.equal(atualizarDigitosDeMoeda('123', ''), '');
});
