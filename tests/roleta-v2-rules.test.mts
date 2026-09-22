import assert from "node:assert/strict";
import test from "node:test";
import { getFaixaRoletaV2 } from "../src/lib/roleta-v2-rules.ts";

test("calcula as seis faixas simples da roleta pelo valor da compra", () => {
  assert.deepEqual([0, 100, 100.01, 200, 200.01, 300, 300.01, 400, 400.01, 500, 500.01].map((valor) => getFaixaRoletaV2(valor).nivel), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6]);
  assert.equal(getFaixaRoletaV2(220).nome, "Conta entre R$ 200 e R$ 300");
});

test("rejeita valores inválidos para uma sessão de roleta", () => {
  assert.throws(() => getFaixaRoletaV2(-0.01));
  assert.throws(() => getFaixaRoletaV2(Number.NaN));
});
