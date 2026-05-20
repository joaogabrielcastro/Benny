import { forbidden } from "../lib/AppError.js";

/**
 * RBAC simples — exige uma das roles listadas.
 */
export function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    const role = req.user?.role || "user";
    if (!allowed.has(role)) {
      return next(forbidden("Permissão insuficiente para esta ação"));
    }
    next();
  };
}
