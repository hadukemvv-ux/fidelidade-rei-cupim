import assert from "node:assert/strict";
import test from "node:test";
import { rotationForSector } from "../src/lib/wheelLanding.ts";

test("a roleta termina com a fatia escolhida pelo servidor sob o ponteiro", () => {
  for (const start of [0, 27, 183, 2130]) {
    for (let sector = 0; sector < 6; sector++) {
      const end = rotationForSector(start, sector);
      assert.ok(end - start >= 1800);
      assert.equal((end + sector * 60 + 30) % 360, 0);
    }
  }
});

test("a roleta recusa uma fatia inexistente", () => {
  assert.throws(() => rotationForSector(0, -1));
  assert.throws(() => rotationForSector(0, 6));
});
