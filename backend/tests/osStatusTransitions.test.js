import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OS_STATUS,
  OS_TRANSICOES,
  assertTransicaoStatusOs,
  podeTransicionarStatusOs,
} from "../src/domain/osStatusTransitions.js";

describe("osStatusTransitions", () => {
  it("expõe os 4 status reais do domínio", () => {
    assert.deepEqual(OS_STATUS, [
      "Aberta",
      "Em andamento",
      "Finalizada",
      "Cancelada",
    ]);
  });

  it("permite transições operacionais válidas", () => {
    assert.equal(podeTransicionarStatusOs("Aberta", "Em andamento"), true);
    assert.equal(podeTransicionarStatusOs("Aberta", "Cancelada"), true);
    assert.equal(podeTransicionarStatusOs("Em andamento", "Finalizada"), true);
    assert.equal(podeTransicionarStatusOs("Em andamento", "Cancelada"), true);
  });

  it("permite manter o mesmo status (update de metadados)", () => {
    for (const s of OS_STATUS) {
      assert.equal(podeTransicionarStatusOs(s, s), true);
    }
  });

  it("bloqueia transições inválidas", () => {
    const invalidas = [
      ["Finalizada", "Cancelada"],
      ["Finalizada", "Aberta"],
      ["Finalizada", "Em andamento"],
      ["Cancelada", "Aberta"],
      ["Cancelada", "Em andamento"],
      ["Cancelada", "Finalizada"],
      ["Aberta", "Finalizada"],
      ["Em andamento", "Aberta"],
    ];
    for (const [de, para] of invalidas) {
      assert.equal(
        podeTransicionarStatusOs(de, para),
        false,
        `${de} → ${para}`,
      );
    }
  });

  it("assertTransicaoStatusOs lança com código STATUS_TRANSITION_INVALID", () => {
    assert.throws(
      () => assertTransicaoStatusOs("Finalizada", "Cancelada"),
      (err) => err.code === "STATUS_TRANSITION_INVALID",
    );
  });

  it("matriz Completa: cada origem só lista destinos permitidos", () => {
    assert.deepEqual(OS_TRANSICOES.Aberta, ["Em andamento", "Cancelada"]);
    assert.deepEqual(OS_TRANSICOES["Em andamento"], [
      "Finalizada",
      "Cancelada",
    ]);
    assert.deepEqual(OS_TRANSICOES.Finalizada, []);
    assert.deepEqual(OS_TRANSICOES.Cancelada, []);
  });
});
