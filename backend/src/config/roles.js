/** Papéis do sistema (RBAC). */
export const ROLES = {
  ADMIN: "admin",
  MECANICO: "mecanico",
};

const LEGACY_ADMIN_ALIASES = new Set(["user", "atendente", ""]);

/** Normaliza role do JWT/DB (legado `user` → admin). */
export function normalizeRole(role) {
  const r = String(role ?? "").trim().toLowerCase();
  if (r === ROLES.MECANICO) return ROLES.MECANICO;
  if (r === ROLES.ADMIN) return ROLES.ADMIN;
  if (LEGACY_ADMIN_ALIASES.has(r)) return ROLES.ADMIN;
  return ROLES.ADMIN;
}

export function isAdmin(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function isMecanico(role) {
  return normalizeRole(role) === ROLES.MECANICO;
}
