/**
 * Benny opera em modo single-tenant: uma oficina (Bennys Centro Automotivo).
 * Colunas tenant_id permanecem no schema para isolamento futuro, mas o runtime
 * sempre usa SINGLE_TENANT_ID (padrão: 1).
 */
export const SINGLE_TENANT_MODE = process.env.SINGLE_TENANT_MODE !== "false";

export const SINGLE_TENANT_ID = Number(process.env.DEFAULT_TENANT_ID || 1);

/** ID do tenant para queries — ignora qualquer tenant no JWT. */
export function resolveTenantId(_req) {
  return SINGLE_TENANT_ID;
}
