import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { montarCorpoEmissaoNfseDps } from "../src/services/nuvemFiscalNfsePayload.js";

describe("montarCorpoEmissaoNfseDps — Padrão Nacional", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE = "4105805";
    process.env.NUVEM_FISCAL_CNPJ_EMITENTE = "55961553000100";
    process.env.NUVEM_FISCAL_TOMADOR_CEP = "83411100";
    process.env.NUVEM_FISCAL_TOMADOR_CPF = "12345678909";
    process.env.NUVEM_FISCAL_ALIQUOTA_ISS = "2";
    delete process.env.NUVEM_FISCAL_FORCAR_ALIQ_ISS_DPS;
    delete process.env.NUVEM_FISCAL_TP_RET_ISSQN;
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
  };
  const baseServicos = [
    {
      codigo: "S1",
      descricao: "Servico",
      quantidade: 1,
      valor_total: 200,
    },
  ];

  it("envia apenas regEspTrib em prest.regTrib (sem opSimpNac)", () => {
    const result = montarCorpoEmissaoNfseDps(
      baseOs,
      baseCliente,
      [],
      baseServicos,
    );
    assert.equal(result.ok, true);

    const regTrib = result.body.infDPS.prest.regTrib;
    assert.deepEqual(regTrib, { regEspTrib: 0 });
    assert.equal("opSimpNac" in regTrib, false);
    assert.equal("regApTribSN" in regTrib, false);
  });

  it("ME/EPP sem retenção (tpRetISSQN=1): tribMun sem pAliq, vBC, vISSQN", () => {
    const result = montarCorpoEmissaoNfseDps(
      baseOs,
      baseCliente,
      [],
      baseServicos,
    );
    assert.equal(result.ok, true);

    const tribMun = result.body.infDPS.valores.trib.tribMun;
    assert.equal("pAliqAplic" in tribMun, false);
    assert.deepEqual(tribMun, { tribISSQN: 1, tpRetISSQN: 1 });
    assert.equal(
      result.body.infDPS.valores.trib.totTrib.vTotTrib.vTotTribMun,
      0,
    );
  });

  it("com retenção (tpRetISSQN=2): envia pAliq, vBC e vISSQN", () => {
    process.env.NUVEM_FISCAL_TP_RET_ISSQN = "2";

    const result = montarCorpoEmissaoNfseDps(
      baseOs,
      baseCliente,
      [],
      baseServicos,
    );
    assert.equal(result.ok, true);

    const tribMun = result.body.infDPS.valores.trib.tribMun;
    assert.equal(tribMun.tpRetISSQN, 2);
    assert.equal(tribMun.pAliq, 2);
    assert.equal(tribMun.vBC, 200);
    assert.equal(tribMun.vISSQN, 4);
  });

  it("usa IBGE do tomador no endereço e IBGE da oficina no local de prestação", () => {
    const clienteCuritiba = {
      ...baseCliente,
      cep: "81020670",
      codigo_ibge: "4106902",
      cidade: "Curitiba",
    };
    const result = montarCorpoEmissaoNfseDps(
      baseOs,
      clienteCuritiba,
      [],
      baseServicos,
    );
    assert.equal(result.ok, true);
    assert.equal(result.body.infDPS.toma.end.endNac.cMun, "4106902");
    assert.equal(result.body.infDPS.toma.end.endNac.CEP, "81020670");
    assert.equal(result.body.infDPS.serv.locPrest.cLocPrestacao, "4105805");
  });
});
