import { SINGLE_TENANT_MODE } from "../config/singleTenant.js";
import {
  planHasFeature,
  upgradeTargetForFeature,
} from "../config/plans.js";
import { getTenantById } from "../services/billingService.js";

const FEATURE_LABELS = {
  agenda: "Agenda de serviços",
  contas_pagar: "Contas a pagar",
  relatorios: "Relatórios e indicadores",
  nfse: "Emissão de NFS-e",
  backup: "Backup completo",
};

/**
 * Bloqueia rotas cujo recurso não está incluído no plano da oficina.
 * Em SINGLE_TENANT_MODE não aplica.
 */
export function requirePlanFeature(featureKey) {
  return async (req, res, next) => {
    if (SINGLE_TENANT_MODE) return next();

    const tenantId = req.tenantId ?? req.user?.tenantId;
    if (!tenantId) return next();

    try {
      const tenant = await getTenantById(tenantId);
      const plano = tenant?.plano || "basic";
      if (planHasFeature(plano, featureKey)) return next();

      const label = FEATURE_LABELS[featureKey] || featureKey;
      return res.status(403).json({
        error: `${label} está disponível a partir do plano ${upgradeTargetForFeature(plano, featureKey) === "premium" ? "Premium" : "Enterprise"}. Faça upgrade para liberar.`,
        code: "PLAN_FEATURE",
        feature: featureKey,
        upgrade_para: upgradeTargetForFeature(plano, featureKey),
      });
    } catch (err) {
      return next(err);
    }
  };
}
