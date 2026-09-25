import assert from "node:assert/strict";
import test from "node:test";
import { canAccessOperationalRoute } from "../src/lib/operationalRoles.ts";

test("papéis válidos seguem a matriz de consulta e alteração", () => {
  assert.equal(canAccessOperationalRoute("garcom", "garcom", ["garcom", "superadmin"]), true);
  assert.equal(canAccessOperationalRoute("caixa", "garcom", ["garcom", "superadmin"]), false);
  assert.equal(canAccessOperationalRoute("caixa", "caixa", ["caixa", "superadmin"]), true);
  assert.equal(canAccessOperationalRoute("gestor", "caixa", ["caixa", "superadmin"]), false);
  assert.equal(canAccessOperationalRoute("gestor", "gestor"), true);
  assert.equal(canAccessOperationalRoute("gestor", "superadmin"), false);
  assert.equal(canAccessOperationalRoute("superadmin", "superadmin"), true);
  assert.equal(canAccessOperationalRoute("superadmin", "garcom", ["garcom", "superadmin"]), true);
});

test("papéis desconhecidos nunca recebem acesso", () => {
  for (const role of [undefined, null, "", "admin", "GESTOR", 3]) {
    assert.equal(canAccessOperationalRoute(role, "garcom"), false);
    assert.equal(canAccessOperationalRoute(role, "gestor"), false);
  }
});
