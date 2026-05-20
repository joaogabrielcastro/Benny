import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";
import { resolveTenantId } from "../config/singleTenant.js";

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação necessário" });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.tenantId = resolveTenantId(req);
    req.user = {
      id: payload.userId,
      email: payload.email,
      nome: payload.nome,
      role: payload.role || "user",
    };
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
