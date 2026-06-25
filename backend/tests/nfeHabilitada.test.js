import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  isNfeEmissaoHabilitada,
  isNfseIncluirPecas,
  mensagemNfeDesabilitada,
} from "../src/config/nuvemFiscal.js";

describe("isNfeEmissaoHabilitada", () => {
  const prev = process.env.NUVEM_FISCAL_NFE_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.NUVEM_FISCAL_NFE_ENABLED;
    else process.env.NUVEM_FISCAL_NFE_ENABLED = prev;
  });

  it("desligada por padrão", () => {
    delete process.env.NUVEM_FISCAL_NFE_ENABLED;
    assert.equal(isNfeEmissaoHabilitada(), false);
  });

  it("liga com NUVEM_FISCAL_NFE_ENABLED=1", () => {
    process.env.NUVEM_FISCAL_NFE_ENABLED = "1";
    assert.equal(isNfeEmissaoHabilitada(), true);
  });

  it("mensagem explica motivo", () => {
    assert.match(mensagemNfeDesabilitada(), /SEFAZ|CSRT|NFS-e/i);
  });
});

describe("isNfseIncluirPecas", () => {
  const prevNfe = process.env.NUVEM_FISCAL_NFE_ENABLED;
  const prevInc = process.env.NUVEM_FISCAL_NFSE_INCLUIR_PECAS;

  afterEach(() => {
    if (prevNfe === undefined) delete process.env.NUVEM_FISCAL_NFE_ENABLED;
    else process.env.NUVEM_FISCAL_NFE_ENABLED = prevNfe;
    if (prevInc === undefined) delete process.env.NUVEM_FISCAL_NFSE_INCLUIR_PECAS;
    else process.env.NUVEM_FISCAL_NFSE_INCLUIR_PECAS = prevInc;
  });

  it("inclui peças quando NF-e está desligada", () => {
    delete process.env.NUVEM_FISCAL_NFE_ENABLED;
    delete process.env.NUVEM_FISCAL_NFSE_INCLUIR_PECAS;
    assert.equal(isNfseIncluirPecas(), true);
  });

  it("só serviços quando NF-e está ligada", () => {
    process.env.NUVEM_FISCAL_NFE_ENABLED = "1";
    delete process.env.NUVEM_FISCAL_NFSE_INCLUIR_PECAS;
    assert.equal(isNfseIncluirPecas(), false);
  });
});
