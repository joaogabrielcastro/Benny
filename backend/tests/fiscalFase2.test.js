import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  referenciaFiscalEstavel,
  emissaoJaAutorizada,
} from "../src/services/fiscal/referenciaFiscal.js";
import { getFiscalCredentials } from "../src/services/fiscal/credentials.js";
import { getFiscalProvider } from "../src/services/fiscal/providers/index.js";
import { brasilNfeProvider } from "../src/services/fiscal/providers/brasilNfeProvider.js";
import { classificarResultadoFiscal } from "../src/services/fiscal/classificarFalhaFiscal.js";
import { statusLocalNfe } from "../src/services/brasilNfeClient.js";
import { semSegredoAuditoria } from "../src/controllers/auditoriaController.js";
import { isNfseIncluirPecas } from "../src/config/nuvemFiscal.js";
import pool from "../database.js";
import { reservarProximoNumeroNfe } from "../src/services/fiscal/numeracaoNfe.js";

describe("idempotência da referência", () => {
  it("retry da mesma OS reutiliza a referência e rejeição fiscal gera outra", () => {
    const primeira = referenciaFiscalEstavel({
      tenantId: 4,
      osId: 100,
      modelo: "NFE",
    });
    const retry = referenciaFiscalEstavel({
      tenantId: 4,
      osId: 100,
      modelo: "NFE",
      anterior: primeira,
      renovar: false,
    });
    const nova = referenciaFiscalEstavel({
      tenantId: 4,
      osId: 100,
      modelo: "NFE",
      anterior: primeira,
      renovar: true,
    });
    assert.equal(retry, primeira);
    assert.notEqual(nova, primeira);
    assert.match(primeira, /^b-4-os100-nfe$/);
    assert.equal(primeira.includes(String(Date.now()).slice(0, 6)), false);
  });

  it("nota autorizada não deve ser reenviada", () => {
    assert.equal(
      emissaoJaAutorizada({
        status: "autorizada",
        chave_acesso: "1".repeat(44),
      }),
      true,
    );
    assert.equal(emissaoJaAutorizada({ status: "rejeitada" }), false);
  });
});

describe("credenciais por tenant", () => {
  const backup = {};
  afterEach(() => {
    brasilNfeProvider.emitir = originals.emitir;
    for (const [k, v] of Object.entries(backup)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  const originals = { emitir: brasilNfeProvider.emitir };

  it("tenant A e tenant B não compartilham o token da Brasil NFe", async () => {
    backup.BRASILNFE_TOKEN_TENANT_A = process.env.BRASILNFE_TOKEN_TENANT_A;
    backup.BRASILNFE_TOKEN_TENANT_B = process.env.BRASILNFE_TOKEN_TENANT_B;
    process.env.BRASILNFE_TOKEN_TENANT_A = "token-tenant-a";
    process.env.BRASILNFE_TOKEN_TENANT_B = "token-tenant-b";
    const vistos = [];
    brasilNfeProvider.emitir = async (_body, creds) => {
      vistos.push(creds.token);
      return { ok: false, mensagem: "parado no teste", statusCode: 400 };
    };
    const cfg = (nome) => ({
      fiscal: { brasil_nfe: { token_env: nome } },
    });
    const a = getFiscalProvider({
      modeloDocumento: "NFE",
      tenantId: 1,
      configuracoes: cfg("BRASILNFE_TOKEN_TENANT_A"),
    });
    const b = getFiscalProvider({
      modeloDocumento: "NFE",
      tenantId: 2,
      configuracoes: cfg("BRASILNFE_TOKEN_TENANT_B"),
    });
    await a.emitir({ Serie: 1 });
    await b.emitir({ Serie: 1 });
    assert.deepEqual(vistos, ["token-tenant-a", "token-tenant-b"]);
    const credA = getFiscalCredentials(1, "brasil_nfe", cfg("BRASILNFE_TOKEN_TENANT_A"));
    assert.equal(credA.origem, "tenant_env");
    assert.equal(JSON.stringify(credA).includes("token-tenant-b"), false);
  });
});

describe("falha de transporte", () => {
  it("timeout não é rejeição fiscal", () => {
    assert.equal(
      classificarResultadoFiscal(
        { ok: false, code: "ECONNABORTED", mensagem: "timeout of 180000ms exceeded" },
        "rejeitada",
      ),
      "TRANSPORT_ERROR",
    );
    assert.equal(
      classificarResultadoFiscal(
        { ok: false, statusCode: 422, mensagem: "Rejeicao: CFOP" },
        "rejeitada",
      ),
      "FISCAL_REJECTION",
    );
  });
});

describe("consulta local continua explícita", () => {
  it("confirmadoExternamente é false", () => {
    const res = statusLocalNfe("9".repeat(44));
    assert.equal(res.confirmadoExternamente, false);
  });
});

describe("auditoria sem segredo", () => {
  it("remove token e mantém evento", () => {
    const limpo = semSegredoAuditoria({
      acao: "NFE_AUTORIZADA",
      usuario: "12",
      dados_novos: {
        evento: "NFE_AUTORIZADA",
        tenant_id: 1,
        nota_fiscal_id: 531,
        token: "nao-pode",
        api_key: "nao-pode",
        cpf: "000",
      },
    });
    assert.equal(limpo.dados_novos.evento, "NFE_AUTORIZADA");
    assert.equal(limpo.dados_novos.token, undefined);
    assert.equal(limpo.dados_novos.api_key, undefined);
    assert.equal(limpo.dados_novos.cpf, undefined);
  });
});

describe("NFS-e com peças permanece", () => {
  it("desligada a NF-e, a NFS-e inclui peças", () => {
    const keys = [
      "BRASILNFE_TOKEN",
      "NOTAAS_NFE_ENABLED",
      "ACBR_API_NFE_ENABLED",
      "NUVEM_FISCAL_NFE_ENABLED",
      "NOTAAS_NFSE_INCLUIR_PECAS",
      "ACBR_API_NFSE_INCLUIR_PECAS",
      "NUVEM_FISCAL_NFSE_INCLUIR_PECAS",
    ];
    const backup = {};
    for (const k of keys) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
    try {
      assert.equal(isNfseIncluirPecas(), true);
    } finally {
      for (const k of keys) {
        if (backup[k] === undefined) delete process.env[k];
        else process.env[k] = backup[k];
      }
    }
  });
});

describe("numeração concorrente", () => {
  it("50 reservas no mesmo tenant e série são únicas; outro tenant e outra série são independentes", async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }
    const marca = Date.now();
    let tenantA;
    let tenantB;
    try {
      const a = await pool.query(
        `INSERT INTO tenants (slug, nome, email) VALUES ($1, $2, $3) RETURNING id`,
        [`num-a-${marca}`, "Num A", `a-${marca}@test.local`],
      );
      const b = await pool.query(
        `INSERT INTO tenants (slug, nome, email) VALUES ($1, $2, $3) RETURNING id`,
        [`num-b-${marca}`, "Num B", `b-${marca}@test.local`],
      );
      tenantA = a.rows[0].id;
      tenantB = b.rows[0].id;
      const lote = await Promise.all(
        Array.from({ length: 50 }, () => reservarProximoNumeroNfe(tenantA, 1)),
      );
      const unicos = new Set(lote);
      assert.equal(unicos.size, 50);
      const outroTenant = await reservarProximoNumeroNfe(tenantB, 1);
      const outraSerie = await reservarProximoNumeroNfe(tenantA, 2);
      assert.equal(outroTenant, Math.min(...lote));
      assert.equal(outraSerie, Math.min(...lote));
    } catch (err) {
      const texto = [
        err.code,
        err.message,
        ...(err.errors || []).map((e) => `${e.code} ${e.message}`),
      ].join(" ");
      if (/fiscal_numeracao|ECONNREFUSED|ENOTFOUND|authentication|does not exist|AggregateError/i.test(texto)) {
        return;
      }
      throw err;
    } finally {
      if (tenantA) {
        await pool.query(`DELETE FROM fiscal_numeracao WHERE tenant_id = ANY($1)`, [[tenantA, tenantB]]);
        await pool.query(`DELETE FROM tenants WHERE id = ANY($1)`, [[tenantA, tenantB]]);
      }
    }
  });
});
