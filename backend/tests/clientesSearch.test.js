import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizarBuscaCliente } from "../src/services/clientesService.js";

describe("busca de clientes", () => {
  it("remove máscara de CNPJ", () => {
    assert.deepEqual(normalizarBuscaCliente(" 13.738.306/0001-91 "), {
      texto: "13.738.306/0001-91",
      digitos: "13738306000191",
    });
  });

  it("remove máscara de CPF e telefone", () => {
    assert.equal(
      normalizarBuscaCliente("(41) 99999-1234").digitos,
      "41999991234",
    );
    assert.equal(
      normalizarBuscaCliente("123.456.789-09").digitos,
      "12345678909",
    );
  });

  it("preserva nomes e ignora espaços externos", () => {
    assert.deepEqual(normalizarBuscaCliente("  João da Silva  "), {
      texto: "João da Silva",
      digitos: "",
    });
  });
});

describe("normalizarBuscaCliente — termos mistos", () => {
  it("termo com letras e dígitos não vira busca por telefone", () => {
    assert.equal(normalizarBuscaCliente("E2E Teste").digitos, "");
    assert.equal(normalizarBuscaCliente("Oficina 2000").digitos, "");
  });
});
