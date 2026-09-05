import test from 'node:test';
import assert from 'node:assert/strict';
import { chancesPorNivel, pesoPorNivel, premioReservado, sortearPremioPorPeso } from '../src/lib/roleta-rules.ts';

const premios = [
  { id: 1, nome: 'PLAYSTATION!!!', tipo: 'produto', probabilidade: 1, ativo: true },
  { id: 2, nome: 'Sobremesa', tipo: 'produto', probabilidade: 20, ativo: true },
  { id: 3, nome: 'Não foi...', tipo: 'nada', probabilidade: 40, ativo: true },
];

test('prêmio especial não participa da roleta diária', () => {
  assert.equal(premioReservado(premios[0]), true);
  assert.equal(pesoPorNivel(premios[0], 1), 0);
});

test('níveis aumentam chance de prêmio e reduzem não-premiação', () => {
  assert.equal(pesoPorNivel(premios[1], 1), 20);
  assert.equal(pesoPorNivel(premios[1], 2), 30);
  assert.equal(pesoPorNivel(premios[1], 3), 50);
  assert.equal(pesoPorNivel(premios[2], 2), 28);
  assert.equal(pesoPorNivel(premios[2], 3), 16);
});

test('chances sempre somam 100% entre itens elegíveis', () => {
  for (const nivel of [1, 2, 3] as const) {
    const chances = chancesPorNivel(premios, nivel);
    const total = premios.reduce((sum, premio) => sum + (chances.get(premio.id) || 0), 0);
    assert.ok(Math.abs(total - 100) < .000001);
    assert.equal(chances.get(1), 0);
  }
});

test('sorteio ponderado nunca retorna item reservado', () => {
  assert.equal(sortearPremioPorPeso(premios, 1, 0)?.id, 2);
  assert.equal(sortearPremioPorPeso(premios, 1, .999999)?.id, 3);
});
