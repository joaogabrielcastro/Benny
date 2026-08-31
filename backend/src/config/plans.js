/**
 * Catálogo de planos SaaS (Stripe Price IDs via env).
 * Preços exibidos são informativos; cobrança real vem do Stripe.
 */

export const PLAN_IDS = ["basic", "premium", "enterprise"];

const PLAN_DEFS = {
  basic: {
    id: "basic",
    nome: "Basic",
    descricao: "Oficina pequena — OS, orçamentos e estoque",
    precoMensalCentavos: 10000,
    precoLabel: "R$ 100/mês",
    maxUsuarios: 2,
    maxOrcamentosMes: 50,
    destaque: false,
  },
  premium: {
    id: "premium",
    nome: "Premium",
    descricao: "Oficina média — mais usuários e volume",
    precoMensalCentavos: 25000,
    precoLabel: "R$ 250/mês",
    maxUsuarios: 5,
    maxOrcamentosMes: 200,
    destaque: true,
  },
  enterprise: {
    id: "enterprise",
    nome: "Enterprise",
    descricao: "Oficina grande — teto alto de usuários",
    precoMensalCentavos: 39700,
    precoLabel: "R$ 397/mês",
    maxUsuarios: 999,
    maxOrcamentosMes: 9999,
    destaque: false,
  },
};

export function getPlanCatalog() {
  return PLAN_IDS.map((id) => {
    const def = PLAN_DEFS[id];
    const priceEnv = process.env[`STRIPE_PRICE_${id.toUpperCase()}`] || "";
    return {
      ...def,
      stripePriceId: priceEnv.trim() || null,
      disponivel: Boolean(priceEnv.trim()),
    };
  });
}

export function getPlanById(planId) {
  const id = String(planId || "").toLowerCase().trim();
  if (!PLAN_DEFS[id]) return null;
  return getPlanCatalog().find((p) => p.id === id) || null;
}

export function getPlanByStripePriceId(priceId) {
  const pid = String(priceId || "").trim();
  if (!pid) return null;
  return getPlanCatalog().find((p) => p.stripePriceId === pid) || null;
}

export function maxUsuariosForPlan(planId) {
  const p = PLAN_DEFS[String(planId || "").toLowerCase()];
  return p?.maxUsuarios ?? PLAN_DEFS.basic.maxUsuarios;
}

export function maxOrcamentosMesForPlan(planId) {
  const p = PLAN_DEFS[String(planId || "").toLowerCase()];
  return p?.maxOrcamentosMes ?? PLAN_DEFS.basic.maxOrcamentosMes;
}
