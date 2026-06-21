import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resumoMensagensApi,
  extrairDetalheRejeicaoNuvem,
  camposFromRespostaNuvem,
} from "../src/services/notasFiscais/nuvemRespostaParser.js";

describe("nuvemRespostaParser — rejeição NF-e", () => {
  it("extrai motivo_status da autorização SEFAZ", () => {
    const data = {
      status: "rejeitado",
      autorizacao: {
        codigo_status: 573,
        motivo_status: "Rejeicao: IE do emitente invalida",
      },
    };
    assert.match(resumoMensagensApi(data), /573/);
    assert.match(resumoMensagensApi(data), /IE do emitente invalida/i);
    assert.match(extrairDetalheRejeicaoNuvem(data), /573/);
  });

  it("usa label NF-e nas mensagens padrão", () => {
    const campos = camposFromRespostaNuvem(
      { status: "rejeitado", autorizacao: { codigo_status: 204, motivo_status: "Duplicidade" } },
      100,
      "NFE",
    );
    assert.equal(campos.status, "rejeitada");
    assert.match(campos.detalheRejeicao, /204/);
    assert.match(campos.mensagem, /204|Duplicidade/);
  });
});
