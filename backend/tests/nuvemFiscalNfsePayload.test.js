import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { montarCorpoEmissaoNfseDps } from "../src/services/nuvemFiscalNfsePayload.js";

describe("montarCorpoEmissaoNfseDps — Notaas", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.NOTAAS_API_KEY = "ntaas_test_key_xxxxxxxx";
    process.env.NOTAAS_CODIGO_MUNICIPIO_IBGE = "4105805";
    process.env.NOTAAS_CNPJ_EMITENTE = "55961553000100";
    process.env.NOTAAS_C_TRIB_NAC = "310103";
    process.env.NOTAAS_C_NBS = "120013110";
    process.env.NOTAAS_ALIQUOTA_ISS = "2";
    process.env.NOTAAS_TOMADOR_CEP = "83411100";
    process.env.NOTAAS_TOMADOR_CPF = "12345678909";
    delete process.env.NOTAAS_NFE_ENABLED;
    delete process.env.NUVEM_FISCAL_NFE_ENABLED;
    delete process.env.ACBR_API_NFE_ENABLED;
    delete process.env.NOTAAS_ISS_RETIDO;
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  const baseOs = { id: 1, numero: "OS-001" };
  const baseCliente = {
    nome: "Cliente Teste",
    cep: "83411100",
    cpf_cnpj: "12345678909",
    codigo_ibge: "4105805",
    cidade: "Colombo",
    uf: "PR",
    bairro: "Centro",
    endereco: "Rua Teste",
    numero: "100",
  };
  const baseServicos = [
    {
      codigo: "S1",
      descricao: "Servico",
      quantidade: 1,
      valor_total: 200,
    },
  ];

  it("monta body Notaas com tomador/servico/valores", () => {
    const result = montarCorpoEmissaoNfseDps(
      baseOs,
      baseCliente,
      [],
      baseServicos,
    );
    assert.equal(result.ok, true);
    assert.equal(result.body.tomador.cpf, "12345678909");
    assert.equal(result.body.tomador.nome, "Cliente Teste");
    assert.equal(result.body.servico.codigo, "310103");
    assert.equal(result.body.servico.localPrestacao, "4105805");
    assert.equal(result.body.servico.nbs, "120013110");
    assert.equal(result.body.valores.total, 200);
    assert.equal(result.body.valores.aliquotaIss, 2);
    assert.equal(result.body.valores.issRetido, false);
    assert.match(result.body.competencia, /^\d{4}-\d{2}$/);
    assert.ok(result.body.referencia);
    assert.equal("infDPS" in result.body, false);
  });

  it("com NF-e desligada: inclui peças no valor e na descrição", () => {
    const produtos = [
      {
        codigo: "P1",
        descricao: "Filtro oleo",
        quantidade: 1,
        valor_total: 80,
      },
    ];
    const os = { ...baseOs, valor_servicos: 200, valor_produtos: 80 };

    const result = montarCorpoEmissaoNfseDps(
      os,
      baseCliente,
      produtos,
      baseServicos,
    );
    assert.equal(result.ok, true);
    assert.equal(result.body.valores.total, 280);
    assert.match(result.body.servico.descricao, /Servicos prestados conforme OS OS-001/);
    assert.match(result.body.servico.descricao, /Filtro oleo/);
    assert.match(result.body.servico.descricao, /Servico/);
  });

  it("com NF-e ligada: NFS-e só com valor de serviços", () => {
    process.env.NOTAAS_NFE_ENABLED = "1";

    const produtos = [
      {
        codigo: "P1",
        descricao: "Filtro oleo",
        quantidade: 1,
        valor_total: 80,
      },
    ];
    const os = { ...baseOs, valor_servicos: 200, valor_produtos: 80 };

    const result = montarCorpoEmissaoNfseDps(
      os,
      baseCliente,
      produtos,
      baseServicos,
    );
    assert.equal(result.ok, true);
    assert.equal(result.body.valores.total, 200);
    assert.equal(result.body.servico.descricao.includes("Filtro oleo"), false);
  });

  it("usa CNPJ do tomador quando cliente é PJ", () => {
    const clientePj = {
      ...baseCliente,
      cpf_cnpj: "12345678000195",
      nome: "Empresa LTDA",
    };
    const result = montarCorpoEmissaoNfseDps(
      baseOs,
      clientePj,
      [],
      baseServicos,
    );
    assert.equal(result.ok, true);
    assert.equal(result.body.tomador.cnpj, "12345678000195");
    assert.equal(result.body.tomador.cpf, undefined);
  });

  it("exige IBGE do município da oficina", () => {
    delete process.env.NOTAAS_CODIGO_MUNICIPIO_IBGE;
    delete process.env.ACBR_API_CODIGO_MUNICIPIO_IBGE;
    delete process.env.NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE;
    delete process.env.NOTAAS_TOMADOR_C_MUN;
    delete process.env.NUVEM_FISCAL_TOMADOR_C_MUN;

    const result = montarCorpoEmissaoNfseDps(
      baseOs,
      baseCliente,
      [],
      baseServicos,
    );
    assert.equal(result.ok, false);
    assert.match(result.erro, /NOTAAS_CODIGO_MUNICIPIO_IBGE/);
  });
});
