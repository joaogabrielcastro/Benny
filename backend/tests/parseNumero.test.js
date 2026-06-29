import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseInteiroBR, parseNumeroBR } from "../src/lib/parseNumero.js";

describe("parseNumeroBR", () => {
  it("aceita número puro", () => {
    assert.equal(parseNumeroBR(100), 100);
    assert.equal(parseNumeroBR("42"), 42);
  });

  it("interpreta milhar com ponto (pt-BR)", () => {
    assert.equal(parseNumeroBR("100.000"), 100000);
    assert.equal(parseNumeroBR("1.234.567"), 1234567);
  });

  it("interpreta decimal com vírgula", () => {
    assert.equal(parseNumeroBR("100,5"), 100.5);
    assert.equal(parseNumeroBR("1.234,56"), 1234.56);
  });
});

describe("parseInteiroBR", () => {
  it("arredonda e interpreta km formatado", () => {
    assert.equal(parseInteiroBR("100.000"), 100000);
    assert.equal(parseInteiroBR("85.432"), 85432);
  });
});
