import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("auditoriaController — isolamento por tenant", () => {
  it("exige tenant via EXISTS na tabela viva ou tenant_id no JSON", () => {
    const src = fs.readFileSync(
      path.join(dir, "../src/controllers/auditoriaController.js"),
      "utf8",
    );
    assert.match(src, /resolveTenantId/);
    assert.match(src, /t\.tenant_id = \$2/);
    assert.match(src, /dados_novos->>'tenant_id'/);
    assert.match(src, /dados_anteriores->>'tenant_id'/);
    assert.doesNotMatch(
      src,
      /WHERE tabela = 'ordens_servico' AND registro_id = \$1\s*ORDER/,
    );
  });
});
