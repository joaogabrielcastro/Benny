import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { montarCorpoEmissaoNfe } from "../src/services/nuvemFiscalNfePayload.js";
import { resolveCodigoIbgeCliente } from "../src/domain/clienteIbge.js";
import cepService from "../src/services/cepService.js";

const produto = {
  produto_id: 9,
  codigo: "P1",
  descricao: "Filtro",
  quantidade: 1,
  valor_unitario: 10,
  valor_total: 10,
  ncm: "84212300",
};

function clienteCompleto(extra = {}) {
  return {
    nome: "Cliente Teste",
    cpf_cnpj: "123.456.789-09",
    endereco: "Rua A",
    numero: "100",
    bairro: "Centro Real",
    cep: "83411-100",
    cidade: "Colombo",
    estado: "pr",
    codigo_ibge: "4105805",
    situacao_icms: "NAO_CONTRIBUINTE",
    ...extra,
  };
}

function emitir(cliente, extraProdutos) {
  return montarCorpoEmissaoNfe(
    { id: 1, numero: "OS-1" },
    cliente,
    extraProdutos || [produto],
    {
      nNF: 3,
      referencia: "b-1-os1-nfe",
      configFiscal: { crt: 1, icms: { tipo: "CSOSN", codigo: "102" }, cfopResolvido: "5102" },
      consumidorFinal: true,
    },
  );
}

describe("destinatário da NF-e", () => {
  it("monta o payload com os dados reais do cliente", () => {
    const result = emitir(clienteCompleto());
    assert.equal(result.ok, true);
    assert.equal(result.body.Cliente.CpfCnpj, "12345678909");
    assert.equal(result.body.Cliente.NmCliente, "Cliente Teste");
    assert.equal(result.body.Cliente.Endereco.Cep, "83411100");
    assert.equal(result.body.Cliente.Endereco.Uf, "PR");
    assert.equal(result.body.Cliente.Endereco.Municipio, "Colombo");
    assert.equal(result.body.Cliente.Endereco.Bairro, "Centro Real");
    assert.equal(result.body.Cliente.Endereco.CodMunicipio, "4105805");
    assert.equal(result.body.Cliente.IndicadorIe, 9);
    assert.equal(result.body.ConsumidorFinal, true);
  });

  it("documento inválido bloqueia e não monta corpo", () => {
    const result = emitir(clienteCompleto({ cpf_cnpj: "123" }));
    assert.equal(result.code, "NFE_DESTINATARIO_INCOMPLETO");
    assert.equal(result.body, undefined);
    assert.ok(result.campos.some((c) => c.campo === "cpf_cnpj"));
  });

  it("lista todos os campos ausentes de uma vez", () => {
    const result = emitir({
      nome: "Cliente",
      endereco: "Rua A",
      numero: "10",
      cidade: "Curitiba",
      estado: "PR",
    });
    const nomes = result.campos.map((c) => c.campo);
    assert.equal(result.code, "NFE_DESTINATARIO_INCOMPLETO");
    for (const campo of ["cpf_cnpj", "cep", "bairro", "codigo_ibge"]) {
      assert.ok(nomes.includes(campo), campo);
    }
  });

  it("não inventa bairro, cidade nem UF", () => {
    const semBairro = emitir(clienteCompleto({ bairro: "" }));
    assert.equal(JSON.stringify(semBairro).includes("Centro"), false);
    const semCidade = emitir(clienteCompleto({ cidade: "" }));
    assert.equal(JSON.stringify(semCidade).includes("Colombo"), false);
    const semUf = emitir(clienteCompleto({ estado: "" }));
    assert.equal(JSON.stringify(semUf).includes('"PR"'), false);
    assert.equal(semUf.body, undefined);
  });

  it("ENV de tomador não completa o destinatário", () => {
    process.env.NOTAAS_TOMADOR_CPF = "52998224725";
    process.env.NOTAAS_TOMADOR_CEP = "80010000";
    process.env.NOTAAS_TOMADOR_C_MUN = "4106902";
    const result = emitir(
      clienteCompleto({ cpf_cnpj: "", cep: "", codigo_ibge: "" }),
    );
    const texto = JSON.stringify(result);
    assert.equal(result.code, "NFE_DESTINATARIO_INCOMPLETO");
    assert.equal(texto.includes("52998224725"), false);
    assert.equal(texto.includes("80010000"), false);
    assert.equal(texto.includes("4106902"), false);
    delete process.env.NOTAAS_TOMADOR_CPF;
    delete process.env.NOTAAS_TOMADOR_CEP;
    delete process.env.NOTAAS_TOMADOR_C_MUN;
  });

  it("resolve o IBGE pelo CEP do próprio cliente e usa esse código", async () => {
    const original = cepService.buscarEnderecoPorCep;
    cepService.buscarEnderecoPorCep = async () => ({ ibge: "4106902" });
    try {
      const ibge = await resolveCodigoIbgeCliente("80010000", "");
      const result = emitir(
        clienteCompleto({ cep: "80010000", codigo_ibge: ibge, cidade: "Curitiba", estado: "PR" }),
      );
      assert.equal(ibge, "4106902");
      assert.equal(result.body.Cliente.Endereco.CodMunicipio, "4106902");
    } finally {
      cepService.buscarEnderecoPorCep = original;
    }
  });

  it("prioriza NCM antes do destinatário e valida antes da numeração", () => {
    const semNcm = {
      ...produto,
      ncm: null,
      produto_ncm: null,
    };
    const result = emitir(clienteCompleto({ cep: "" }), [semNcm]);
    assert.equal(result.code, "NFE_PRODUTO_SEM_NCM");
    const src = readFileSync(
      new URL("../src/services/notasFiscais/notasFiscaisEmitir.js", import.meta.url),
      "utf8",
    );
    const ncm = src.indexOf("avaliarNcmItensNfe");
    const dest = src.indexOf("validarDestinatarioNfe");
    const numero = src.indexOf("reservarProximoNumeroNfe");
    const http = src.indexOf("provider.emitir");
    assert.ok(ncm > 0 && ncm < dest && dest < numero && numero < http);
    assert.match(src, /clientes WHERE id = \$1 AND tenant_id = \$2/);
  });

  it("não contribuinte envia IndicadorIe 9 e omite IE", () => {
    const result = emitir(clienteCompleto());
    assert.equal(result.body.Cliente.IndicadorIe, 9);
    assert.equal(result.body.Cliente.Ie, undefined);
    assert.equal(result.body.ConsumidorFinal, true);
  });

  it("contribuinte envia IndicadorIe 1 e a IE cadastrada", () => {
    const result = emitir(
      clienteCompleto({
        cpf_cnpj: "11222333000181",
        situacao_icms: "CONTRIBUINTE_ICMS",
        inscricao_estadual: "123.456.789",
      }),
    );
    assert.equal(result.body.Cliente.IndicadorIe, 1);
    assert.equal(result.body.Cliente.Ie, "123.456.789");
  });

  it("contribuinte sem IE bloqueia sem corpo", () => {
    const result = emitir(
      clienteCompleto({
        situacao_icms: "CONTRIBUINTE_ICMS",
        inscricao_estadual: "",
      }),
    );
    assert.equal(result.code, "NFE_DESTINATARIO_INCOMPLETO");
    assert.equal(result.body, undefined);
    assert.ok(result.campos.some((c) => c.campo === "inscricao_estadual"));
  });

  it("isento envia IndicadorIe 2 sem inventar a palavra ISENTO", () => {
    const result = emitir(
      clienteCompleto({ situacao_icms: "CONTRIBUINTE_ISENTO" }),
    );
    assert.equal(result.body.Cliente.IndicadorIe, 2);
    assert.equal(result.body.Cliente.Ie, undefined);
    assert.equal(JSON.stringify(result.body).includes("ISENTO"), false);
  });

  it("CPF ou CNPJ sem situação não viram contribuinte nem não contribuinte", () => {
    for (const doc of ["12345678909", "11222333000181"]) {
      const result = emitir(clienteCompleto({ cpf_cnpj: doc, situacao_icms: null }));
      assert.equal(result.code, "NFE_DESTINATARIO_INCOMPLETO");
      assert.equal(result.body, undefined);
      assert.ok(result.campos.some((c) => c.campo === "situacao_icms"));
    }
  });

  it("não mistura IE de outro cliente", () => {
    const a = emitir(
      clienteCompleto({
        nome: "Tenant A",
        situacao_icms: "CONTRIBUINTE_ICMS",
        inscricao_estadual: "IE-TENANT-A",
      }),
    );
    const b = emitir(
      clienteCompleto({ nome: "Tenant B", situacao_icms: null, inscricao_estadual: "" }),
    );
    assert.equal(a.body.Cliente.Ie, "IE-TENANT-A");
    assert.equal(JSON.stringify(b).includes("IE-TENANT-A"), false);
  });

  it("não mistura dados de outro cliente", () => {
    const a = emitir(clienteCompleto({ nome: "Tenant A" }));
    const b = emitir(clienteCompleto({ nome: "", cpf_cnpj: "" }));
    assert.equal(a.body.Cliente.NmCliente, "Tenant A");
    assert.equal(b.code, "NFE_DESTINATARIO_INCOMPLETO");
    assert.equal(JSON.stringify(b).includes("Tenant A"), false);
  });
});
