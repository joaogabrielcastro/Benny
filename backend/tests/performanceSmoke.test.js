/**
 * Helpers de performance para smoke checks (sem load test pesado).
 * Garante que funções puras críticas respondem em tempo aceitável.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcularTotais } from "../src/domain/calcularTotais.js";
import { parseNumeroBR } from "../src/lib/parseNumero.js";
import { createOrcamentoSchema } from "../src/schemas/comercialSchemas.js";

describe("performance smoke (funções puras)", () => {
  it("calcularTotais em lote grande < 50ms", () => {
    const produtos = Array.from({ length: 500 }, (_, i) => ({
      quantidade: 2,
      valor_unitario: 10 + i,
      valor_total: (10 + i) * 2,
    }));
    const servicos = Array.from({ length: 200 }, (_, i) => ({
      quantidade: 1,
      valor_unitario: 50 + i,
      valor_total: 50 + i,
    }));
    const t0 = performance.now();
    const tot = calcularTotais(produtos, servicos);
    const ms = performance.now() - t0;
    assert.ok(tot.valor_total > 0);
    assert.ok(ms < 50, `demorou ${ms.toFixed(2)}ms`);
  });

  it("parseNumeroBR 1000 iterações < 30ms", () => {
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      parseNumeroBR("1.234,56");
    }
    const ms = performance.now() - t0;
    assert.ok(ms < 30, `demorou ${ms.toFixed(2)}ms`);
  });

  it("Zod parse orçamento com 50 itens < 100ms", () => {
    const payload = {
      cliente_id: 1,
      veiculo_id: 2,
      produtos: Array.from({ length: 50 }, (_, i) => ({
        codigo: `P${i}`,
        descricao: `Item ${i}`,
        quantidade: "1",
        valor_unitario: "10,00",
        valor_total: "10,00",
      })),
      servicos: [],
    };
    const t0 = performance.now();
    createOrcamentoSchema.parse(payload);
    const ms = performance.now() - t0;
    assert.ok(ms < 100, `demorou ${ms.toFixed(2)}ms`);
  });
});
