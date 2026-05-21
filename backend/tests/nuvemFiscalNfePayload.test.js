import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { montarCorpoEmissaoNfe } from "../src/services/nuvemFiscalNfePayload.js";

describe("montarCorpoEmissaoNfe", () => {
  it("inclui nNF obrigatório em infNFe.ide", () => {
    const os = { id: 1, numero: "OS-100" };
    const cliente = {
      nome: "Cliente",
      cep: "83411100",
      cpf_cnpj: "12345678909",
      cidade: "Colombo",
      estado: "PR",
    };
    const produtos = [
      {
        codigo: "P1",
        descricao: "Filtro",
        quantidade: 1,
        valor_unitario: 50,
        valor_total: 50,
      },
    ];

    const result = montarCorpoEmissaoNfe(os, cliente, produtos, { nNF: 42 });
    assert.equal(result.ok, true);
    assert.equal(result.body.infNFe.ide.nNF, 42);
    assert.equal(result.body.infNFe.ide.serie, 1);
  });

  it("falha sem nNF", () => {
    const os = { id: 1, numero: "OS-100" };
    const cliente = {
      nome: "Cliente",
      cep: "83411100",
      cpf_cnpj: "12345678909",
      cidade: "Colombo",
      estado: "PR",
    };
    const produtos = [
      { codigo: "P1", descricao: "Peca", quantidade: 1, valor_total: 10 },
    ];

    const result = montarCorpoEmissaoNfe(os, cliente, produtos, {});
    assert.equal(result.ok, false);
    assert.match(result.erro, /nNF/i);
  });
});
