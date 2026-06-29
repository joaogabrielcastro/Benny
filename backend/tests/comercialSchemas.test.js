import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createOrcamentoSchema } from "../src/schemas/comercialSchemas.js";

describe("createOrcamentoSchema", () => {
  const base = {
    cliente_id: 1,
    veiculo_id: 2,
    produtos: [],
    servicos: [],
  };

  it("converte km formatado em pt-BR para inteiro", () => {
    const parsed = createOrcamentoSchema.parse({
      ...base,
      km: "100.000",
    });
    assert.equal(parsed.km, 100000);
  });

  it("converte quantidade de produto formatada", () => {
    const parsed = createOrcamentoSchema.parse({
      ...base,
      produtos: [
        {
          codigo: "P1",
          descricao: "Filtro",
          quantidade: "2",
          valor_unitario: "150,00",
          valor_total: "300,00",
        },
      ],
    });
    assert.equal(parsed.produtos[0].quantidade, 2);
    assert.equal(parsed.produtos[0].valor_unitario, 150);
    assert.equal(parsed.produtos[0].valor_total, 300);
  });

  it("rejeita km inválido", () => {
    const result = createOrcamentoSchema.safeParse({
      ...base,
      km: "abc",
    });
    assert.equal(result.success, false);
  });
});
