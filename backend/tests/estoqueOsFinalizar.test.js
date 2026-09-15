import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("ordensServico — estoque na finalização", () => {
  it("não baixa estoque novamente ao finalizar (evita dedução dupla)", () => {
    const src = fs.readFileSync(
      path.join(dir, "../src/services/ordensServicoService.js"),
      "utf8",
    );
    assert.doesNotMatch(src, /OS finalizada - baixa/);
    assert.match(src, /Finalizar NÃO deve baixar/);
    assert.match(src, /Utilizado na OS/);
    assert.match(src, /OS cancelada - devolução/);
  });
});

describe("orcamentos — vincula movimentação ao OS", () => {
  it("ao converter, associa os_id nas movimentações do orçamento", () => {
    const src = fs.readFileSync(
      path.join(dir, "../src/services/orcamentosService.js"),
      "utf8",
    );
    assert.match(
      src,
      /UPDATE movimentacoes_estoque SET os_id = COALESCE\(os_id, \$1\)/,
    );
  });
});
