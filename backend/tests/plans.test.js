import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getPlanById,
  getPlanCatalog,
  maxUsuariosForPlan,
  maxOrcamentosMesForPlan,
  PLAN_IDS,
} from "../src/config/plans.js";

describe("plans catalog", () => {
  it("expõe 3 planos", () => {
    assert.deepEqual(PLAN_IDS, ["basic", "premium", "enterprise"]);
    assert.equal(getPlanCatalog().length, 3);
  });

  it("limites de usuários", () => {
    assert.equal(maxUsuariosForPlan("basic"), 2);
    assert.equal(maxUsuariosForPlan("premium"), 5);
    assert.equal(maxUsuariosForPlan("enterprise"), 999);
  });

  it("limites de orçamentos/mês", () => {
    assert.equal(maxOrcamentosMesForPlan("basic"), 50);
    assert.equal(maxOrcamentosMesForPlan("premium"), 200);
    assert.equal(maxOrcamentosMesForPlan("enterprise"), 9999);
  });

  it("getPlanById", () => {
    assert.equal(getPlanById("premium")?.nome, "Premium");
    assert.equal(getPlanById("nope"), null);
  });
});
