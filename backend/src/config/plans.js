/**
 * Catálogo de planos SaaS (Stripe Price IDs via env).
 * Preços exibidos são informativos; cobrança real vem do Stripe.
 */

export const PLAN_IDS = ["basic", "premium", "enterprise"];

/** Chaves usadas no middleware requirePlanFeature */
export const PLAN_FEATURE_KEYS = [
  "agenda",
  "contas_pagar",
  "relatorios",
  "nfse",
  "backup",
];

const PLAN_FEATURES = {
  basic: {
    agenda: false,
    contas_pagar: false,
    relatorios: false,
    nfse: false,
    backup: false,
  },
  premium: {
    agenda: true,
    contas_pagar: true,
    relatorios: true,
    nfse: false,
    backup: false,
  },
  enterprise: {
    agenda: true,
    contas_pagar: true,
    relatorios: true,
    nfse: true,
    backup: true,
  },
};

const PLAN_DEFS = {
  basic: {
    id: "basic",
    nome: "Basic",
    descricao: "Essencial para oficina pequena — OS, orçamentos e estoque",
    precoMensalCentavos: 10000,
    precoLabel: "R$ 100/mês",
    maxUsuarios: 2,
    maxOrcamentosMes: 50,
    destaque: false,
    recursos: [
      "Ordens de serviço",
      "Orçamentos com aprovação do cliente",
      "Controle de estoque",
      "Cadastro de clientes e veículos",
    ],
    beneficiosExtras: [],
  },
  premium: {
    id: "premium",
    nome: "Premium",
    descricao: "Oficina em crescimento — gestão completa e relatórios",
    precoMensalCentavos: 25000,
    precoLabel: "R$ 250/mês",
    maxUsuarios: 5,
    maxOrcamentosMes: 200,
    destaque: true,
    recursos: [
      "Tudo do Basic",
      "Agenda de serviços",
      "Contas a pagar",
      "Relatórios e indicadores",
      "Fechamento mensal fiscal",
    ],
    beneficiosExtras: ["Suporte prioritário por e-mail"],
  },
  enterprise: {
    id: "enterprise",
    nome: "Enterprise",
    descricao: "Operação grande — fiscal, backup e suporte dedicado",
    precoMensalCentavos: 39700,
    precoLabel: "R$ 397/mês",
    maxUsuarios: 999,
    maxOrcamentosMes: 9999,
    destaque: false,
    recursos: [
      "Tudo do Premium",
      "Emissão de NFS-e",
      "Backup completo (.zip)",
      "Usuários e orçamentos ilimitados",
    ],
    beneficiosExtras: [
      "Suporte dedicado via WhatsApp",
      "Onboarding personalizado",
    ],
  },
};

export function getPlanFeatures(planId) {
  const id = String(planId || "basic").toLowerCase().trim();
  return { ...(PLAN_FEATURES[id] || PLAN_FEATURES.basic) };
}

export function planHasFeature(planId, featureKey) {
  const features = getPlanFeatures(planId);
  return Boolean(features[featureKey]);
}

export function getPlanCatalog() {
  return PLAN_IDS.map((id) => {
    const def = PLAN_DEFS[id];
    const priceEnv = process.env[`STRIPE_PRICE_${id.toUpperCase()}`] || "";
    return {
      ...def,
      features: getPlanFeatures(id),
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

export function upgradeTargetForFeature(currentPlanId, featureKey) {
  const current = String(currentPlanId || "basic").toLowerCase();
  if (current === "basic") return "premium";
  if (current === "premium" && !planHasFeature("premium", featureKey)) {
    return "enterprise";
  }
  return "enterprise";
}
