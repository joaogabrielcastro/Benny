import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  gerarCsvResumo,
  montarResumoFromNotas,
  rotuloMes,
  validarPeriodo,
} from "../src/services/fechamentoMensal/fechamentoMensalUtils.js";

describe("fechamentoMensalUtils", () => {
  it("valida ano e mês", () => {
    assert.equal(validarPeriodo(2026, 8).ok, true);
    assert.equal(validarPeriodo(1999, 8).ok, false);
    assert.equal(validarPeriodo(2026, 13).ok, false);
  });

  it("monta rótulo do período", () => {
    assert.equal(rotuloMes(2026, 8), "Agosto/2026");
  });

  it("agrega totais por modelo e status", () => {
    const resumo = montarResumoFromNotas(
      [
        {
          id: 1,
          ordem_servico_id: 10,
          os_numero: "OS-001",
          modelo_documento: "NFSE",
          status: "autorizada",
          numero: "100",
          chave_acesso: "CHAVE1",
          valor_total: 1000,
          data_emissao: "2026-08-05T12:00:00.000Z",
          id_provedor: "inv_1",
          mensagem_status: null,
          tributos: { valor_iss: 20, valor_pis: 6.5, valor_cofins: 30 },
        },
        {
          id: 2,
          ordem_servico_id: 11,
          os_numero: "OS-002",
          modelo_documento: "NFSE",
          status: "cancelada",
          numero: "101",
          chave_acesso: "CHAVE2",
          valor_total: 500,
          data_emissao: "2026-08-10T12:00:00.000Z",
          id_provedor: "inv_2",
          mensagem_status: "Cancelada por erro",
          tributos: {},
        },
        {
          id: 3,
          ordem_servico_id: 12,
          os_numero: "OS-003",
          modelo_documento: "NFE",
          status: "autorizada",
          numero: "55",
          chave_acesso: "CHAVE3",
          valor_total: 250,
          data_emissao: "2026-08-12T12:00:00.000Z",
          id_provedor: null,
          mensagem_status: null,
          tributos: { valor_icms: 45 },
        },
      ],
      2026,
      8,
    );

    assert.equal(resumo.totais.nfseAutorizadas, 1);
    assert.equal(resumo.totais.nfseCanceladas, 1);
    assert.equal(resumo.totais.nfeAutorizadas, 1);
    assert.equal(resumo.totais.faturamentoTotal, 1250);
    assert.equal(resumo.totais.tributos.iss, 20);
    assert.equal(resumo.totais.tributos.pis, 6.5);
    assert.equal(resumo.totais.tributos.cofins, 30);
    assert.equal(resumo.totais.tributos.icms, 45);
    assert.equal(resumo.periodo.rotulo, "Agosto/2026");
  });

  it("gera CSV com cabeçalho e linhas", () => {
    const resumo = montarResumoFromNotas(
      [
        {
          id: 1,
          ordem_servico_id: 10,
          os_numero: "OS-001",
          modelo_documento: "NFSE",
          status: "autorizada",
          numero: "100",
          chave_acesso: "CHAVE1",
          valor_total: 100,
          data_emissao: "2026-08-05T12:00:00.000Z",
          id_provedor: "inv_1",
          mensagem_status: null,
          tributos: { valor_iss: 2 },
        },
      ],
      2026,
      8,
    );
    const csv = gerarCsvResumo(resumo.notas);
    assert.match(csv, /^id,os_numero,modelo/);
    assert.match(csv, /NFSE,autorizada/);
  });
});
