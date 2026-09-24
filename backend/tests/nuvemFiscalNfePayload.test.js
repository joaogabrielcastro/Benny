import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { montarCorpoEmissaoNfe } from "../src/services/nuvemFiscalNfePayload.js";

describe("montarCorpoEmissaoNfe (Brasil NFe)", () => {
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
    situacao_icms: "NAO_CONTRIBUINTE",
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
      produto_id: 9,
    },
  ];

  it("monta body Brasil NFe com cliente, produtos e pagamento", () => {
    process.env.BRASILNFE_AMBIENTE = "homologacao";
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-100" },
      clienteOk,
      produtosOk,
      {
        nNF: 42,
        referencia: "benny-nfe-1",
        configFiscal: { crt: 1, icms: { tipo: "CSOSN", codigo: "102" }, cfopResolvido: "5102" },
        consumidorFinal: true,
      },
    );
    assert.equal(result.ok, true);
    assert.equal(result.body.ModeloDocumento, 55);
    assert.equal(result.body.Numero, 42);
    assert.equal(result.body.TipoAmbiente, 2);
    assert.equal(result.body.Cliente.CpfCnpj, "12345678909");
    assert.equal(result.body.Cliente.IndicadorIe, 9);
    assert.equal(result.body.Cliente.Ie, undefined);
    assert.equal(result.body.Cliente.Endereco.CodMunicipio, "4105805");
    assert.equal(result.body.Produtos.length, 1);
    assert.equal(result.body.Produtos[0].NCM, "84212300");
    assert.equal(result.body.Produtos[0].CFOP, 5102);
    assert.equal(result.body.Produtos[0].Imposto.ICMS.CodSituacaoTributaria, "102");
    assert.equal(result.body.Pagamentos[0].FormaPagamento, "01");
    assert.equal(result.body.Pagamentos[0].VlPago, 50);
    assert.equal(result.body.Transporte.ModalidadeFrete, 9);
    assert.equal(result.meta.referencia, "benny-nfe-1");
    assert.equal(result.meta.nNF, 42);
  });

  it("falha sem número da NF-e", () => {
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-100" },
      clienteOk,
      produtosOk,
      {},
    );
    assert.equal(result.ok, false);
    assert.match(result.erro, /Número/i);
  });

  it("falha sem produtos", () => {
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-1" },
      clienteOk,
      [],
      { nNF: 1 },
    );
    assert.equal(result.ok, false);
    assert.match(result.erro, /peças|produtos/i);
  });

  it("falha sem CPF/CNPJ e CEP do cliente", () => {
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-1" },
      { nome: "X", cidade: "Colombo", estado: "PR" },
      produtosOk,
      { nNF: 1 },
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "NFE_DESTINATARIO_INCOMPLETO");
    assert.ok(result.campos.some((c) => c.campo === "cpf_cnpj"));
    assert.ok(result.campos.some((c) => c.campo === "cep"));
  });
});
