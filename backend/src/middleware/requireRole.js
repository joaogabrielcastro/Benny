import { forbidden } from "../lib/AppError.js";
import { normalizeRole } from "../config/roles.js";

/**
 * RBAC simples — exige uma das roles listadas (`admin`, `mecanico`).
 */
export function requireRole(...roles) {
  const allowed = new Set(roles.map((r) => normalizeRole(r)));
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (!allowed.has(role)) {
      return next(forbidden("Permissão insuficiente para esta ação"));
    }
    next();
  };
}
