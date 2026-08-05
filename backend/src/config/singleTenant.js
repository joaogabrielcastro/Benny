/**
 * Tenancy do Benny.
 *
 * - SINGLE_TENANT_MODE=true (default): uma oficina por deploy; ignora JWT tenant.
 * - SINGLE_TENANT_MODE=false: SaaS multi-oficina; tenant vem do JWT (req.user.tenantId).
 */
export const SINGLE_TENANT_MODE = process.env.SINGLE_TENANT_MODE !== "false";

export const SINGLE_TENANT_ID = Number(process.env.DEFAULT_TENANT_ID || 1);

/**
 * ID do tenant para queries.
 * Em multi-tenant: usa req.tenantId (setado pelo auth) ou req.user.tenantId.
 */
export function resolveTenantId(req) {
  if (SINGLE_TENANT_MODE) {
    return SINGLE_TENANT_ID;
  }

  const raw = req?.tenantId ?? req?.user?.tenantId;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    const err = new Error("Tenant não identificado na sessão");
    err.code = "TENANT_REQUIRED";
    throw err;
  }
  return n;
}
