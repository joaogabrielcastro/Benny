import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcularTotais } from "../src/domain/calcularTotais.js";

describe("calcularTotais", () => {
  it("soma produtos e serviços", () => {
    const r = calcularTotais(
      [{ valor_total: 100 }, { valor_total: 50 }],
      [{ valor_total: 60 }],
    );
    assert.equal(r.valor_produtos, 150);
    assert.equal(r.valor_servicos, 60);
    assert.equal(r.valor_total, 210);
  });

  it("aceita listas vazias", () => {
    const r = calcularTotais();
    assert.equal(r.valor_total, 0);
  });
});
