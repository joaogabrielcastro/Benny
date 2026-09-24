import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  FISCAL_PROVIDERS,
  resolveFiscalProviderId,
} from "../src/services/fiscal/constants.js";
import { getFiscalProvider } from "../src/services/fiscal/providers/index.js";
import { notaasProvider } from "../src/services/fiscal/providers/notaasProvider.js";
import { brasilNfeProvider } from "../src/services/fiscal/providers/brasilNfeProvider.js";
import { camposIdentidadeFiscal } from "../src/services/fiscal/persistenciaFiscal.js";
import { calcularProximoNumeroNfe } from "../src/services/fiscal/numeracaoNfe.js";
import { isNfseIncluirPecas } from "../src/config/nuvemFiscal.js";
import { statusLocalNfe } from "../src/services/brasilNfeClient.js";
import pool from "../database.js";
import { buscarPorId } from "../src/services/notasFiscais/notasFiscaisRepository.js";
import { cancelar } from "../src/services/notasFiscais/notasFiscaisCancelar.js";
import { baixarPdf } from "../src/services/notasFiscais/notasFiscaisBaixarPdf.js";

describe("seleção de provider", () => {
  it("NFSE resolve Notaas e NFE resolve Brasil NFe", () => {
    assert.equal(
      resolveFiscalProviderId({ modeloDocumento: "NFSE" }),
      FISCAL_PROVIDERS.NOTAAS,
    );
    assert.equal(
      resolveFiscalProviderId({ modeloDocumento: "NFE" }),
      FISCAL_PROVIDERS.BRASIL_NFE,
    );
    assert.equal(getFiscalProvider({ modeloDocumento: "NFSE" }).id, "notaas");
    assert.equal(getFiscalProvider({ modeloDocumento: "NFE" }).id, "brasil_nfe");
    assert.equal(typeof getFiscalProvider({ modeloDocumento: "NFSE" }).baixarPdf, "function");
    assert.equal(typeof getFiscalProvider({ modeloDocumento: "NFE" }).baixarXml, "function");
  });

  it("provedor persistido ganha do modelo; NULL cai no modelo", () => {
    assert.equal(
      resolveFiscalProviderId({
        modeloDocumento: "NFE",
        provedor: "notaas",
      }),
      FISCAL_PROVIDERS.BRASIL_NFE,
    );
    assert.equal(
      resolveFiscalProviderId({
        modeloDocumento: "NFSE",
        provedor: "nuvem_fiscal",
      }),
      FISCAL_PROVIDERS.NOTAAS,
    );
    assert.equal(
      resolveFiscalProviderId({ modeloDocumento: "NFSE", provedor: null }),
      FISCAL_PROVIDERS.NOTAAS,
    );
    assert.equal(
      resolveFiscalProviderId({
        modeloDocumento: "NFSE",
        provedor: "brasil_nfe",
      }),
      FISCAL_PROVIDERS.BRASIL_NFE,
    );
  });
});

describe("persistência conservadora", () => {
  it("resposta vazia não apaga id, número, chave, série e protocolo", () => {
    const anterior = {
      id_provedor: "inv_1",
      numero: "14",
      chave_acesso: "4".repeat(44),
      serie: "1",
      protocolo: "135240000000001",
    };
    const atual = camposIdentidadeFiscal(
      {
        idProvedor: null,
        numero: "",
        chaveAcesso: undefined,
        serie: null,
        protocolo: "",
      },
      anterior,
    );
    assert.equal(atual.idProvedor, "inv_1");
    assert.equal(atual.numero, "14");
    assert.equal(atual.chaveAcesso, "4".repeat(44));
    assert.equal(atual.serie, "1");
    assert.equal(atual.protocolo, "135240000000001");
  });

  it("valor novo válido substitui o anterior", () => {
    const atual = camposIdentidadeFiscal(
      { idProvedor: "chave-nova", numero: "20", chaveAcesso: "abc", serie: "2", protocolo: "999" },
      { id_provedor: "velho", numero: "1", chave_acesso: "z", serie: "1", protocolo: "1" },
    );
    assert.equal(atual.idProvedor, "chave-nova");
    assert.equal(atual.numero, "20");
    assert.equal(atual.protocolo, "999");
  });
});

describe("numeração NF-e", () => {
  it("o mesmo máximo produz o mesmo próximo número (janela de corrida)", () => {
    const a = calcularProximoNumeroNfe(10, 1);
    const b = calcularProximoNumeroNfe(10, 1);
    assert.equal(a, 11);
    assert.equal(b, 11);
  });
});

describe("regressão NFS-e com peças", () => {
  const keys = [
    "NOTAAS_NFE_ENABLED",
    "ACBR_API_NFE_ENABLED",
    "NUVEM_FISCAL_NFE_ENABLED",
    "BRASILNFE_TOKEN",
    "NOTAAS_NFSE_INCLUIR_PECAS",
  ];
  const backup = {};
  afterEach(() => {
    for (const k of keys) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  it("com NF-e desligada a NFS-e continua incluindo peças", () => {
    for (const k of keys) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
    assert.equal(isNfseIncluirPecas(), true);
  });
});

describe("consulta local da Brasil NFe", () => {
  it("não se apresenta como confirmação externa", () => {
    const chave = "1".repeat(44);
    const res = statusLocalNfe(chave);
    assert.equal(res.ok, true);
    assert.equal(res.confirmadoExternamente, false);
    assert.equal(res.fonte, "local");
  });
});

describe("cancelamento sem ReferenceError", () => {
  const envBackup = {};
  const originals = {
    query: pool.query,
    cancelarNotaas: notaasProvider.cancelar,
    consultarNotaas: notaasProvider.consultar,
    cancelarBrasil: brasilNfeProvider.cancelar,
  };

  afterEach(() => {
    pool.query = originals.query;
    notaasProvider.cancelar = originals.cancelarNotaas;
    notaasProvider.consultar = originals.consultarNotaas;
    brasilNfeProvider.cancelar = originals.cancelarBrasil;
    for (const [k, v] of Object.entries(envBackup)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function nota(parcial) {
    return {
      id: 123,
      tenant_id: 1,
      ordem_servico_id: 9,
      status: "autorizada",
      id_provedor: "inv_nfse",
      numero: "14",
      chave_acesso: null,
      serie: null,
      protocolo: null,
      valor_total: 100,
      tributos: {},
      dados_resposta: {},
      link_pdf: null,
      data_emissao: null,
      modelo_documento: "NFSE",
      provedor: "notaas",
      ...parcial,
    };
  }

  function stubPool(row) {
    pool.query = async (sql, params) => {
      const q = String(sql);
      if (q.includes("FROM notas_fiscais") && q.includes("tenant_id")) {
        if (Number(params[0]) === row.id && Number(params[1]) === row.tenant_id) {
          return { rows: [row] };
        }
        return { rows: [] };
      }
      if (q.includes("UPDATE notas_fiscais")) {
        return { rows: [{ ...row, status: "cancelada" }] };
      }
      if (q.includes("UPDATE ordens_servico") || q.includes("INSERT INTO auditoria")) {
        return { rows: [] };
      }
      throw new Error(`SQL inesperado no teste: ${q.slice(0, 120)}`);
    };
  }

  it("NFS-e autorizada chama o cancelamento da Notaas", async () => {
    envBackup.NOTAAS_API_KEY = process.env.NOTAAS_API_KEY;
    process.env.NOTAAS_API_KEY = "ntaas_teste_hardening";
    const chamadas = [];
    notaasProvider.cancelar = async (id) => {
      chamadas.push(id);
      return { ok: true, data: { status: "cancelled", invoiceId: id } };
    };
    notaasProvider.consultar = async () => ({
      ok: true,
      confirmadoExternamente: true,
      data: { status: "cancelled", invoiceId: "inv_nfse" },
    });
    stubPool(nota({}));
    const result = await cancelar(1, 123, { motivo: "Cancelamento de teste da nota fiscal" });
    assert.equal(result.erro, undefined);
    assert.deepEqual(chamadas, ["inv_nfse"]);
    assert.equal(result.nf.status_nf, "cancelada");
  });

  it("NF-e autorizada chama o cancelamento da Brasil NFe", async () => {
    envBackup.BRASILNFE_TOKEN = process.env.BRASILNFE_TOKEN;
    process.env.BRASILNFE_TOKEN = "token-teste-hardening";
    const chamadas = [];
    brasilNfeProvider.cancelar = async (chave) => {
      chamadas.push(chave);
      return { ok: true, data: { status: "cancelled", invoiceId: chave } };
    };
    const chave = "2".repeat(44);
    stubPool(
      nota({
        modelo_documento: "NFE",
        provedor: "brasil_nfe",
        id_provedor: chave,
        chave_acesso: chave,
        protocolo: "135240000000099",
      }),
    );
    const result = await cancelar(1, 123, {
      motivo: "Cancelamento de teste da nota fiscal",
    });
    assert.equal(result.erro, undefined);
    assert.deepEqual(chamadas, [chave]);
  });

  it("tenant B não recebe a nota do tenant A", async () => {
    const queries = [];
    pool.query = async (sql, params) => {
      queries.push({ sql: String(sql), params });
      return { rows: [] };
    };
    const achou = await buscarPorId(2, 123);
    assert.equal(achou, null);
    assert.match(queries[0].sql, /tenant_id = \$2/);
    assert.deepEqual(queries[0].params, [123, 2]);
  });
});

describe("download pelo provider da nota", () => {
  const originals = {
    query: pool.query,
    pdfNotaas: notaasProvider.baixarPdf,
    pdfBrasil: brasilNfeProvider.baixarPdf,
    consultarNotaas: notaasProvider.consultar,
  };
  const envBackup = {};

  afterEach(() => {
    pool.query = originals.query;
    notaasProvider.baixarPdf = originals.pdfNotaas;
    notaasProvider.consultar = originals.consultarNotaas;
    brasilNfeProvider.baixarPdf = originals.pdfBrasil;
    for (const [k, v] of Object.entries(envBackup)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function stubNota(row) {
    pool.query = async (sql, params) => {
      const q = String(sql);
      if (q.includes("FROM notas_fiscais") && Number(params[1]) === row.tenant_id) {
        return { rows: [row] };
      }
      return { rows: [] };
    };
  }

  it("NFS-e baixa PDF na Notaas e NF-e baixa DANFE na Brasil NFe", async () => {
    envBackup.NOTAAS_API_KEY = process.env.NOTAAS_API_KEY;
    envBackup.BRASILNFE_TOKEN = process.env.BRASILNFE_TOKEN;
    process.env.NOTAAS_API_KEY = "ntaas_teste_pdf";
    process.env.BRASILNFE_TOKEN = "token-pdf";
    const vias = [];
    notaasProvider.consultar = async () => ({
      ok: true,
      confirmadoExternamente: true,
      data: { status: "issued" },
    });
    notaasProvider.baixarPdf = async () => {
      vias.push("notaas");
      return { ok: true, buffer: Buffer.from("%PDF"), contentType: "application/pdf" };
    };
    brasilNfeProvider.baixarPdf = async () => {
      vias.push("brasil_nfe");
      return { ok: true, buffer: Buffer.from("%PDF"), contentType: "application/pdf" };
    };

    stubNota({
      id: 1,
      tenant_id: 7,
      status: "autorizada",
      id_provedor: "inv_1",
      numero: "3",
      modelo_documento: "NFSE",
      provedor: "notaas",
    });
    const nfse = await baixarPdf(7, 1);
    assert.equal(nfse.erro, undefined);

    const chave = "3".repeat(44);
    stubNota({
      id: 2,
      tenant_id: 7,
      status: "autorizada",
      id_provedor: chave,
      numero: "4",
      modelo_documento: "NFE",
      provedor: "brasil_nfe",
    });
    const nfe = await baixarPdf(7, 2);
    assert.equal(nfe.erro, undefined);
    assert.deepEqual(vias, ["notaas", "brasil_nfe"]);
  });
});
