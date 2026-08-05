import { SINGLE_TENANT_MODE } from "../config/singleTenant.js";
import {
  getTenantById,
  isSubscriptionWritable,
} from "../services/billingService.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Bloqueia mutações quando a assinatura não está active/trialing.
 * Em SINGLE_TENANT_MODE não aplica.
 * Rotas /billing/* ficam liberadas para permitir upgrade/portal.
 */
export async function requireActiveSubscription(req, res, next) {
  if (SINGLE_TENANT_MODE) return next();
  if (SAFE_METHODS.has(req.method)) return next();

  const path = req.path || "";
  if (path.startsWith("/billing")) return next();
  if (path.startsWith("/auth")) return next();

  const tenantId = req.tenantId ?? req.user?.tenantId;
  if (!tenantId) return next();

  try {
    const tenant = await getTenantById(tenantId);
    if (isSubscriptionWritable(tenant)) return next();

    return res.status(403).json({
      error:
        "Assinatura inativa ou em atraso. Regularize o pagamento para continuar alterando dados.",
      subscription_status: tenant?.subscription_status || tenant?.status,
      code: "SUBSCRIPTION_INACTIVE",
    });
  } catch (err) {
    return next(err);
  }
}
