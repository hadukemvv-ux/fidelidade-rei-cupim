import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BONUS_CADASTRO_PONTOS,
  CUSTO_ENTREGA_GRATIS_PONTOS,
  INTERVALO_ENTREGA_GRATIS_DIAS,
  calcularCashbackValue,
  calcularPontosEarned,
  calcularProgressaoNivel,
  calcularTicketsEarned,
  getAllNivelThresholds,
  getNivelPorGasto,
  getResumoBeneficiosNivel,
  MENSAGEM_BENEFICIOS_CLUBE,
  PONTOS_POR_REAL_EM_PRODUTOS,
} from '../src/lib/fidelidade-rules.ts';

test('bônus inicial libera uma entrega, com recorrência controlada a cada 14 dias', () => {
  assert.equal(BONUS_CADASTRO_PONTOS, 200);
  assert.equal(CUSTO_ENTREGA_GRATIS_PONTOS, BONUS_CADASTRO_PONTOS);
  assert.equal(INTERVALO_ENTREGA_GRATIS_DIAS, 14);
});

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

test('converte pontos em valor de produtos antes de somar percentuais de cashback', () => {
  assert.equal(PONTOS_POR_REAL_EM_PRODUTOS, 100);
  assert.deepEqual(getAllNivelThresholds().map(({ nivel }) => {
    const resumo = getResumoBeneficiosNivel(nivel);
    return [resumo.percentualProdutos, resumo.percentualCashback, resumo.percentualTotalReferencia];
  }), [[1, 0, 1], [2, 0.5, 2.5], [4, 1, 5], [7, 3, 10]]);
});

test('exemplos da landing usam as funções reais e não tratam total como cashback', () => {
  for (const level of getAllNivelThresholds()) {
    const resumo = getResumoBeneficiosNivel(level.nivel);
    assert.equal(resumo.exemplo.pontos, calcularPontosEarned(100, level.min));
    assert.equal(resumo.exemplo.cashback, calcularCashbackValue(100, level.min));
    assert.equal(resumo.exemplo.valorTotalReferencia, resumo.exemplo.pontos / 100 + resumo.exemplo.cashback);
  }
  assert.deepEqual(getResumoBeneficiosNivel('REI').exemplo, {
    valorCompra: 100, pontos: 700, valorEmProdutos: 7, cashback: 3, valorTotalReferencia: 10,
  });
  assert.deepEqual(getResumoBeneficiosNivel('PRATA').exemplo, {
    valorCompra: 100, pontos: 200, valorEmProdutos: 2, cashback: 0.5, valorTotalReferencia: 2.5,
  });
});

test('mensagem estável mantém proposta de produtos e descontos, sem reposicionar o clube', () => {
  assert.equal(MENSAGEM_BENEFICIOS_CLUBE, 'Acumule pontos para trocar por produtos e cashback para usar em descontos.');
  assert.equal(getResumoBeneficiosNivel('BRONZE').exemplo.pontos, 100);
  assert.equal(getResumoBeneficiosNivel('BRONZE').exemplo.cashback, 0);
});
