import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { montarCorpoEmissaoNfseDps } from "../src/services/nuvemFiscalNfsePayload.js";

describe("montarCorpoEmissaoNfseDps — regTrib Padrão Nacional", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE = "4105805";
    process.env.NUVEM_FISCAL_CNPJ_EMITENTE = "55961553000100";
    process.env.NUVEM_FISCAL_TOMADOR_CEP = "83411100";
    process.env.NUVEM_FISCAL_TOMADOR_CPF = "12345678909";
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("envia apenas regEspTrib em prest.regTrib (sem opSimpNac)", () => {
    const os = { id: 1, numero: "OS-001" };
    const cliente = {
      nome: "Cliente Teste",
      cep: "83411100",
      cpf_cnpj: "12345678909",
    };
    const servicos = [
      {
        codigo: "S1",
        descricao: "Servico",
        quantidade: 1,
        valor_unitario: 100,
        valor_total: 100,
      },
    ];

    const result = montarCorpoEmissaoNfseDps(os, cliente, [], servicos);
    assert.equal(result.ok, true);

    const regTrib = result.body.infDPS.prest.regTrib;
    assert.deepEqual(regTrib, { regEspTrib: 0 });
    assert.equal("opSimpNac" in regTrib, false);
    assert.equal("regApTribSN" in regTrib, false);
  });
});
