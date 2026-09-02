import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calcularCashbackValue,
  calcularPontosEarned,
  calcularProgressaoNivel,
  calcularTicketsEarned,
  getAllNivelThresholds,
  getNivelPorGasto,
} from '../src/lib/fidelidade-rules.ts';

test('classifica corretamente todos os limites de nível', () => {
  assert.equal(getNivelPorGasto(0).nivel, 'BRONZE');
  assert.equal(getNivelPorGasto(99.99).nivel, 'BRONZE');
  assert.equal(getNivelPorGasto(100).nivel, 'PRATA');
  assert.equal(getNivelPorGasto(249.99).nivel, 'PRATA');
  assert.equal(getNivelPorGasto(250).nivel, 'OURO');
  assert.equal(getNivelPorGasto(499.99).nivel, 'OURO');
  assert.equal(getNivelPorGasto(500).nivel, 'REI');
});

test('rejeita gasto inválido', () => {
  assert.throws(() => getNivelPorGasto(-1));
  assert.throws(() => getNivelPorGasto(Number.NaN));
});

test('calcula benefícios com o nível anterior à compra', () => {
  assert.equal(calcularPontosEarned(100, 99), 100);
  assert.equal(calcularPontosEarned(100, 100), 200);
  assert.equal(calcularCashbackValue(199, 100), 1);
  assert.equal(calcularTicketsEarned(99, 500), 9);
});

test('expõe progressão e catálogo sem lacunas', () => {
  const progresso = calcularProgressaoNivel(175);
  assert.equal(progresso.nivel, 'PRATA');
  assert.equal(progresso.proximoNivel, 'OURO');
  assert.equal(progresso.progresso?.gastoFaltante, 75);
  assert.equal(progresso.progresso?.percentual, 50);
  assert.deepEqual(getAllNivelThresholds().map((item) => item.min), [0, 100, 250, 500]);
});
