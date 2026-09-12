import assert from "node:assert/strict";
import test from "node:test";
import { getFaixaRoletaV2 } from "../src/lib/roleta-v2-rules.ts";

test("calcula as cinco faixas da roleta pelo valor da compra", () => {
  assert.deepEqual([0, 99.99, 100, 249.99, 250, 399.99, 400, 499.99, 500].map((valor) => getFaixaRoletaV2(valor).nivel), [1, 1, 2, 2, 3, 3, 4, 4, 5]);
});

test("rejeita valores inválidos para uma sessão de roleta", () => {
  assert.throws(() => getFaixaRoletaV2(-0.01));
  assert.throws(() => getFaixaRoletaV2(Number.NaN));
});
