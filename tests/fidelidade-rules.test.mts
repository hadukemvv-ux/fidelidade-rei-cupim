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

test('mantém o catálogo canônico usado pelo frontend e pelo backend', () => {
  assert.deepEqual(
    getAllNivelThresholds().map(({ nivel, nome, min, max, beneficio }) => ({
      nivel,
      nome,
      min,
      max,
      pontos: beneficio.pontos,
      cashback: beneficio.cashback,
      tickets: beneficio.tickets,
    })),
    [
      { nivel: 'BRONZE', nome: 'Brasa', min: 0, max: 99.99, pontos: 1, cashback: 0, tickets: 1 },
      { nivel: 'PRATA', nome: 'Chama', min: 100, max: 249.99, pontos: 2, cashback: 0.005, tickets: 2 },
      { nivel: 'OURO', nome: 'Nobre', min: 250, max: 499.99, pontos: 4, cashback: 0.01, tickets: 5 },
      { nivel: 'REI', nome: 'Majestade — Rei do Cupim', min: 500, max: null, pontos: 7, cashback: 0.03, tickets: 10 },
    ]
  );
});
