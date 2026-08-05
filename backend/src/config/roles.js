/** Papéis do sistema (RBAC). */
export const ROLES = {
  ADMIN: "admin",
  MECANICO: "mecanico",
};

/** Aliases legados conhecidos → admin (não inclui vazio / desconhecido). */
const LEGACY_ADMIN_ALIASES = new Set(["user", "atendente"]);

/**
 * Normaliza role do JWT/DB.
 * Fail-closed: papéis desconhecidos ou vazios retornam `null` (nunca admin).
 */
export function normalizeRole(role) {
  const r = String(role ?? "").trim().toLowerCase();
  if (!r) return null;
  if (r === ROLES.MECANICO) return ROLES.MECANICO;
  if (r === ROLES.ADMIN) return ROLES.ADMIN;
  if (LEGACY_ADMIN_ALIASES.has(r)) return ROLES.ADMIN;
  return null;
}

/** Exige um papel válido; lança se inválido. */
export function requireKnownRole(role) {
  const normalized = normalizeRole(role);
  if (!normalized) {
    const err = new Error("Perfil de acesso inválido");
    err.code = "INVALID_ROLE";
    throw err;
  }
  return normalized;
}

export function isAdmin(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function isMecanico(role) {
  return normalizeRole(role) === ROLES.MECANICO;
}
