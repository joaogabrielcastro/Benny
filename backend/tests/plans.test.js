import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getPlanById,
  getPlanCatalog,
  getPlanComparison,
  getPlanFeatures,
  maxUsuariosForPlan,
  maxOrcamentosMesForPlan,
  planHasFeature,
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

  it("expõe recursos e benefícios por plano", () => {
    const basic = getPlanById("basic");
    const premium = getPlanById("premium");
    const enterprise = getPlanById("enterprise");

    assert.ok(basic.recursos.length >= 4);
    assert.ok(premium.recursos.some((r) => r.includes("Agenda")));
    assert.ok(enterprise.recursos.some((r) => r.includes("NFS-e")));
    assert.ok(premium.beneficiosExtras.length >= 1);
    assert.ok(enterprise.beneficiosExtras.length >= 1);
  });

  it("features por tier", () => {
    assert.equal(planHasFeature("basic", "agenda"), false);
    assert.equal(planHasFeature("basic", "relatorios"), false);
    assert.equal(planHasFeature("premium", "agenda"), true);
    assert.equal(planHasFeature("premium", "nfse"), false);
    assert.equal(planHasFeature("enterprise", "nfse"), true);
    assert.equal(planHasFeature("enterprise", "backup"), true);
    assert.deepEqual(getPlanFeatures("basic").agenda, false);
  });

  it("matriz de comparação para a página de planos", () => {
    const comparacao = getPlanComparison();
    assert.ok(comparacao.length >= 4);
    assert.equal(comparacao[0].titulo, "Organize sua operação comercial");
    const nfs = comparacao
      .flatMap((s) => s.itens)
      .find((i) => i.label === "Emissão de NFS-e");
    assert.equal(nfs?.valores.enterprise, true);
    assert.equal(nfs?.valores.basic, false);
  });
});
