import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";
import {
  resolveTenantId,
  SINGLE_TENANT_MODE,
  SINGLE_TENANT_ID,
} from "../config/singleTenant.js";
import { normalizeRole } from "../config/roles.js";

/**
 * Se houver Bearer token válido, popula req.user / req.tenantId.
 * Não rejeita requisições sem token (signup público).
 */
export const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const role = normalizeRole(payload.role);
    if (!role) return next();

    const tenantIdFromToken = Number(payload.tenantId);
    req.user = {
      id: payload.userId,
      email: payload.email,
      nome: payload.nome,
      role,
      tenantId: SINGLE_TENANT_MODE
        ? SINGLE_TENANT_ID
        : Number.isFinite(tenantIdFromToken) && tenantIdFromToken > 0
          ? tenantIdFromToken
          : undefined,
    };

    try {
      req.tenantId = resolveTenantId(req);
    } catch {
      // ignora — signup público sem tenant
    }
  } catch {
    // token inválido: segue como anônimo
  }
  return next();
};
