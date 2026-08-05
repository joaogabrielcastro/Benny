import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  isNfeEmissaoHabilitada,
  isNfseIncluirPecas,
  mensagemNfeDesabilitada,
} from "../src/config/nuvemFiscal.js";

const NFE_KEYS = [
  "NOTAAS_NFE_ENABLED",
  "ACBR_API_NFE_ENABLED",
  "NUVEM_FISCAL_NFE_ENABLED",
];
const INC_KEYS = [
  "NOTAAS_NFSE_INCLUIR_PECAS",
  "ACBR_API_NFSE_INCLUIR_PECAS",
  "NUVEM_FISCAL_NFSE_INCLUIR_PECAS",
];

describe("isNfeEmissaoHabilitada", () => {
  const backup = {};

  afterEach(() => {
    for (const k of NFE_KEYS) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  function clearNfe() {
    for (const k of NFE_KEYS) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
  }

  it("desligada por padrão", () => {
    clearNfe();
    assert.equal(isNfeEmissaoHabilitada(), false);
  });

  it("liga com NUVEM_FISCAL_NFE_ENABLED=1", () => {
    clearNfe();
    process.env.NUVEM_FISCAL_NFE_ENABLED = "1";
    assert.equal(isNfeEmissaoHabilitada(), true);
  });

  it("liga com NOTAAS_NFE_ENABLED=true", () => {
    clearNfe();
    process.env.NOTAAS_NFE_ENABLED = "true";
    assert.equal(isNfeEmissaoHabilitada(), true);
  });

  it("mensagem explica motivo", () => {
    assert.match(mensagemNfeDesabilitada(), /NFS-e/i);
  });
});

describe("isNfseIncluirPecas", () => {
  const backup = {};
  const all = [...NFE_KEYS, ...INC_KEYS];

  afterEach(() => {
    for (const k of all) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  function clearAll() {
    for (const k of all) {
      backup[k] = process.env[k];
      delete process.env[k];
    }
  }

  it("inclui peças quando NF-e está desligada", () => {
    clearAll();
    assert.equal(isNfseIncluirPecas(), true);
  });

  it("só serviços quando NF-e está ligada", () => {
    clearAll();
    process.env.NUVEM_FISCAL_NFE_ENABLED = "1";
    assert.equal(isNfseIncluirPecas(), false);
  });
});
