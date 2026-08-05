import { forbidden } from "../lib/AppError.js";
import { normalizeRole } from "../config/roles.js";

/**
 * RBAC simples — exige uma das roles listadas (`admin`, `mecanico`).
 * Role ausente/inválida nunca passa (fail-closed).
 */
export function requireRole(...roles) {
  const allowed = new Set(
    roles.map((r) => normalizeRole(r)).filter(Boolean),
  );
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (!role || !allowed.has(role)) {
      return next(forbidden("Permissão insuficiente para esta ação"));
    }
    next();
  };
}
