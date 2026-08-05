import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getNuvemFiscalConfig,
  isNuvemFiscalConfigured,
  PROVEDOR_FISCAL_ID,
} from "../src/config/nuvemFiscal.js";

const KEYS = [
  "NOTAAS_API_KEY",
  "NOTAAS_API_URL",
  "NOTAAS_AMBIENTE",
  "NOTAAS_CNPJ_EMITENTE",
  "NOTAAS_C_TRIB_NAC",
  "NOTAAS_CODIGO_MUNICIPIO_IBGE",
  "ACBR_API_CLIENT_ID",
  "ACBR_API_CLIENT_SECRET",
  "ACBR_API_URL",
  "ACBR_API_CNPJ_EMITENTE",
  "NUVEM_FISCAL_CLIENT_ID",
  "NUVEM_FISCAL_CNPJ_EMITENTE",
  "NUVEM_FISCAL_C_TRIB_NAC",
];

describe("Notaas config", () => {
  const backup = {};

  afterEach(() => {
    for (const k of KEYS) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  function clearAll() {
    for (const k of KEYS) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
  }

  it("usa URL padrão platform.notaas.com.br/api/v1", () => {
    clearAll();
    process.env.NOTAAS_API_KEY = "ntaas_test_key_xxxxxxxx";
    process.env.NOTAAS_CNPJ_EMITENTE = "55961553000100";
    const cfg = getNuvemFiscalConfig();
    assert.equal(cfg.provedorId, PROVEDOR_FISCAL_ID);
    assert.match(cfg.apiBaseUrl, /platform\.notaas\.com\.br\/api\/v1/);
    assert.equal(isNuvemFiscalConfigured(), true);
  });

  it("não considera configurado sem prefixo ntaas_", () => {
    clearAll();
    process.env.NOTAAS_API_KEY = "invalid_key";
    assert.equal(isNuvemFiscalConfigured(), false);
  });

  it("aceita override NOTAAS_API_URL", () => {
    clearAll();
    process.env.NOTAAS_API_KEY = "ntaas_test_key_xxxxxxxx";
    process.env.NOTAAS_API_URL = "https://example.test/api/v1";
    const cfg = getNuvemFiscalConfig();
    assert.equal(cfg.apiBaseUrl, "https://example.test/api/v1");
  });

  it("prefere NOTAAS_* sobre legado para cTribNac", () => {
    clearAll();
    process.env.NOTAAS_API_KEY = "ntaas_test_key_xxxxxxxx";
    process.env.NUVEM_FISCAL_C_TRIB_NAC = "010700";
    process.env.NOTAAS_C_TRIB_NAC = "310103";
    const cfg = getNuvemFiscalConfig();
    assert.equal(cfg.cTribNac, "310103");
  });

  it("aceita fallback legado NUVEM_FISCAL_C_TRIB_NAC", () => {
    clearAll();
    process.env.NOTAAS_API_KEY = "ntaas_test_key_xxxxxxxx";
    process.env.NUVEM_FISCAL_C_TRIB_NAC = "140101";
    const cfg = getNuvemFiscalConfig();
    assert.equal(cfg.cTribNac, "140101");
  });
});
