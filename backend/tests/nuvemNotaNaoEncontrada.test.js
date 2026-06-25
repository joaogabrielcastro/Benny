import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
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
});
