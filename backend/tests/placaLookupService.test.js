import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  montarUrlWdapi2Consulta,
  placaFormatoValido,
  consultarVeiculoPorPlaca,
  extrairVeiculoDeJson,
} from "../src/services/placaLookupService.js";

describe("placaLookupService", () => {
  it("monta URL WDAPI2 conforme documentação oficial", () => {
    assert.equal(
      montarUrlWdapi2Consulta("INT8C36", "meu-token"),
      "https://wdapi2.com.br/consulta/INT8C36/meu-token",
    );
  });

  it("valida placas antiga e Mercosul", () => {
    assert.equal(placaFormatoValido("ABC1234"), true);
    assert.equal(placaFormatoValido("ABC1D23"), true);
    assert.equal(placaFormatoValido("AB123"), false);
  });

  it("extrai chassi da resposta WDAPI2 (inclusive mascarado)", () => {
    const dados = extrairVeiculoDeJson({
      MARCA: "VW",
      MODELO: "CROSSFOX",
      ano: "2007",
      cor: "Prata",
      chassi: "*****10137",
    });
    assert.equal(dados.marca, "VW");
    assert.equal(dados.chassi, "*****10137");
  });

  it("falha sem WDAPI2_TOKEN configurado", async () => {
    const prev = process.env.WDAPI2_TOKEN;
    delete process.env.WDAPI2_TOKEN;
    delete process.env.CONSULTA_PLACA_GRATIS_URL;
    delete process.env.PLACAFIPE_TOKEN;
    delete process.env.FIPE_PLACA_API_KEY;

    const r = await consultarVeiculoPorPlaca("ABC1D23");
    assert.equal(r.ok, false);
    assert.match(r.erro, /WDAPI2_TOKEN|provedor/i);

    if (prev !== undefined) process.env.WDAPI2_TOKEN = prev;
  });
});
