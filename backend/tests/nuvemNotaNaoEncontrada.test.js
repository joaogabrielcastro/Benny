import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isNuvemFilaProcessamento,
  isNuvemNotaNaoEncontrada,
  mensagemNotaNaoEncontradaAmbiente,
} from "../src/services/notasFiscais/nuvemNotaNaoEncontrada.js";

describe("isNuvemNotaNaoEncontrada", () => {
  it("detecta HTTP 404", () => {
    assert.equal(isNuvemNotaNaoEncontrada({ ok: false, statusCode: 404 }), true);
  });

  it("detecta código NfseNotFound", () => {
    assert.equal(
      isNuvemNotaNaoEncontrada({
        ok: false,
        detalhe: { error: { code: "NfseNotFound" } },
      }),
      true,
    );
  });

  it("ignora outros erros", () => {
    assert.equal(
      isNuvemNotaNaoEncontrada({ ok: false, statusCode: 400 }),
      false,
    );
  });

  it("mensagem orienta reemissão", () => {
    assert.match(mensagemNotaNaoEncontradaAmbiente(), /Reemitir/i);
  });

  it("detecta fila de processamento da Nuvem", () => {
    assert.equal(
      isNuvemFilaProcessamento({
        ok: false,
        detalhe: {
          error: {
            code: "ValidationFailed",
            message:
              "Validation failed: A nota ainda se encontra na fila de processamento.",
          },
        },
      }),
      true,
    );
  });
});
