import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { montarCorpoEmissaoNfe } from "../src/services/nuvemFiscalNfePayload.js";

describe("montarCorpoEmissaoNfe", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE = "4105805";
    process.env.NUVEM_FISCAL_CNPJ_EMITENTE = "55961553000100";
    process.env.NUVEM_FISCAL_EMITENTE_IE = "1234567890";
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("inclui nNF obrigatório em infNFe.ide", () => {
    const os = { id: 1, numero: "OS-100" };
    const cliente = {
      nome: "Cliente",
      cep: "83411100",
      cpf_cnpj: "12345678909",
      cidade: "Colombo",
      estado: "PR",
      codigo_ibge: "4105805",
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
    assert.equal(result.body.infNFe.emit.IE, "1234567890");
    assert.equal(result.body.infNFe.emit.CRT, 1);
  });

  it("falha sem IE do emitente", () => {
    delete process.env.NUVEM_FISCAL_EMITENTE_IE;
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-1" },
      {
        nome: "Cliente",
        cep: "83411100",
        cpf_cnpj: "12345678909",
        cidade: "Colombo",
        estado: "PR",
      },
      [{ codigo: "P1", descricao: "Peca", quantidade: 1, valor_total: 10 }],
      { nNF: 1 },
    );
    assert.equal(result.ok, false);
    assert.match(result.erro, /IE/i);
  });

  it("falha sem nNF", () => {
    const os = { id: 1, numero: "OS-100" };
    const cliente = {
      nome: "Cliente",
      cep: "83411100",
      cpf_cnpj: "12345678909",
      cidade: "Colombo",
      estado: "PR",
      codigo_ibge: "4105805",
    };
    const produtos = [
      { codigo: "P1", descricao: "Peca", quantidade: 1, valor_total: 10 },
    ];

    const result = montarCorpoEmissaoNfe(os, cliente, produtos, {});
    assert.equal(result.ok, false);
    assert.match(result.erro, /nNF/i);
  });
});
