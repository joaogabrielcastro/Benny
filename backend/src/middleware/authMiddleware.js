/**
 * Middleware de Autenticação JWT
 */

import jwt from "jsonwebtoken";
import pool from "../../database.js";

const JWT_SECRET = process.env.JWT_SECRET || "sua-chave-secreta-muito-forte";

class AuthMiddleware {
  /**
   * Middleware principal: valida JWT
   */
  async authenticate(req, res, next) {
    try {
      // 1. Extrair token do header Authorization
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Não autenticado",
          message: "Token não fornecido",
        });
      }

      const token = authHeader.substring(7); // Remove "Bearer "

      // 2. Verificar e decodificar JWT
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (error) {
        return res.status(401).json({
          error: "Token inválido",
          message: error.message,
        });
      }

      // 3. Validar estrutura do token
      if (!decoded.userId) {
        return res.status(401).json({
          error: "Token malformado",
          message: "Token não contém userId",
        });
      }

      // 4. Injetar dados do JWT
      req.user = {
        id: decoded.userId,
        role: decoded.role,
      };
      req.userId = decoded.userId;

      next();
    } catch (error) {
      console.error("Erro no auth middleware:", error);
      return res.status(500).json({
        error: "Erro de autenticação",
        message: error.message,
      });
    }
  }

  /**
   * Middleware de permissões: valida role do usuário
   */
  requireRole(allowedRoles = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: "Não autenticado",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: "Sem permissão",
          message: `Esta ação requer um dos seguintes perfis: ${allowedRoles.join(", ")}`,
          seu_perfil: req.user.role,
        });
      }

      next();
    };
  }

  /**
   * Gera JWT token
   */
  generateToken(userId, role, expiresIn = "7d") {
    return jwt.sign(
      {
        userId,
        role,
      },
      JWT_SECRET,
      { expiresIn },
    );
  }

  /**
   * Verifica token sem autenticar
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

export default new AuthMiddleware();
