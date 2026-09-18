import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { montarCorpoEmissaoNfe } from "../src/services/nuvemFiscalNfePayload.js";

describe("montarCorpoEmissaoNfe (Notaas)", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.NOTAAS_CODIGO_MUNICIPIO_IBGE = "4105805";
    process.env.NOTAAS_NFE_CFOP = "5102";
    process.env.NOTAAS_NFE_CSOSN = "102";
    process.env.NOTAAS_NFE_NCM = "87089990";
    process.env.NOTAAS_NFE_SERIE = "1";
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  const clienteOk = {
    nome: "Cliente Teste",
    cep: "83411100",
    cpf_cnpj: "12345678909",
    cidade: "Colombo",
    estado: "PR",
    codigo_ibge: "4105805",
    endereco: "Rua A",
    numero: "100",
    bairro: "Centro",
  };

  const produtosOk = [
    {
      codigo: "P1",
      descricao: "Filtro de oleo",
      quantidade: 2,
      valor_unitario: 25,
      valor_total: 50,
      ncm: "84212300",
    },
  ];

  it("monta body Notaas com dest, items e pagamentos", () => {
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-100" },
      clienteOk,
      produtosOk,
      { nNF: 42, referencia: "benny-nfe-1" },
    );
    assert.equal(result.ok, true);
    assert.equal(result.body.modelo, 55);
    assert.equal(result.body.dest.cpf, "12345678909");
    assert.equal(result.body.dest.endereco.codigoMunicipio, 4105805);
    assert.equal(result.body.items.length, 1);
    assert.equal(result.body.items[0].ncm, "84212300");
    assert.equal(result.body.items[0].cfop, "5102");
    assert.equal(result.body.items[0].csosn, "102");
    assert.equal(result.body.pagamentos[0].tipoPagamento, "01");
    assert.equal(result.body.pagamentos[0].valor, 50);
    assert.equal(result.meta.referencia, "benny-nfe-1");
    assert.equal(result.meta.nNF, 42);
    assert.equal(result.body.referencia, undefined);
  });

  it("funciona sem nNF (numeração fica na Notaas)", () => {
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-100" },
      clienteOk,
      produtosOk,
      {},
    );
    assert.equal(result.ok, true);
    assert.equal(result.meta.nNF, null);
  });

  it("falha sem produtos", () => {
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-1" },
      clienteOk,
      [],
      {},
    );
    assert.equal(result.ok, false);
    assert.match(result.erro, /peças|produtos/i);
  });

  it("falha sem CPF/CNPJ e CEP do cliente", () => {
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-1" },
      { nome: "X", cidade: "Colombo", estado: "PR" },
      produtosOk,
      {},
    );
    assert.equal(result.ok, false);
    assert.match(result.erro, /CPF|CNPJ|CEP|IBGE/i);
  });
});
