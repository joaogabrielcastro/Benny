import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  isNfeEmissaoHabilitada,
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
