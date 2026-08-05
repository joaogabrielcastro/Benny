import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";
import {
  resolveTenantId,
  SINGLE_TENANT_MODE,
  SINGLE_TENANT_ID,
} from "../config/singleTenant.js";
import { normalizeRole } from "../config/roles.js";
import { extractTokenFromRequest } from "../lib/authCookie.js";

export const requireAuth = (req, res, next) => {
  const token = extractTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: "Token de autenticação necessário" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const role = normalizeRole(payload.role);
    if (!role) {
      return res
        .status(401)
        .json({ error: "Token com perfil de acesso inválido" });
    }

    const tenantIdFromToken = Number(payload.tenantId);
    if (
      !SINGLE_TENANT_MODE &&
      (!Number.isFinite(tenantIdFromToken) || tenantIdFromToken <= 0)
    ) {
      return res.status(401).json({ error: "Token sem tenant válido" });
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      nome: payload.nome,
      role,
      tenantId: SINGLE_TENANT_MODE ? SINGLE_TENANT_ID : tenantIdFromToken,
    };

    try {
      req.tenantId = resolveTenantId(req);
    } catch {
      return res
        .status(401)
        .json({ error: "Tenant não identificado na sessão" });
    }

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Sessão expirada, faça login novamente" });
    }
    return res.status(401).json({ error: "Token inválido" });
  }
};
