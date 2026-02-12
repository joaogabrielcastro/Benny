/**
 * Middleware de Autenticação JWT com Multi-Tenant
 * 
 * Estratégia simplificada para SaaS pequeno (10-50 oficinas):
 * - JWT contém tenantId no payload
 * - Valida token + tenant em uma camada
 * - Sem complicação de headers separados
 */

import jwt from "jsonwebtoken";
import pool from "../../database.js";

const JWT_SECRET = process.env.JWT_SECRET || "sua-chave-secreta-muito-forte";

class AuthMiddleware {
  /**
   * Middleware principal: valida JWT e injeta tenant
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
      if (!decoded.userId || !decoded.tenantId) {
        return res.status(401).json({
          error: "Token malformado",
          message: "Token não contém userId ou tenantId",
        });
      }

      // 4. Buscar tenant e validar status + expiração (1 query otimizada)
      const tenantResult = await pool.query(
        "SELECT id, status, data_expiracao FROM tenants WHERE id = $1",
        [decoded.tenantId],
      );

      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          error: "Organização não encontrada",
          message: "Sua organização foi removida do sistema",
        });
      }

      const tenant = tenantResult.rows[0];

      // 5. BLOQUEIO AUTOMÁTICO - Validar status
      if (tenant.status !== "active") {
        return res.status(403).json({
          error: "Acesso bloqueado",
          message: `Sua organização está ${tenant.status}`,
          status: tenant.status,
        });
      }

      // 6. BLOQUEIO AUTOMÁTICO - Validar expiração
      if (tenant.data_expiracao) {
        const now = new Date();
        const expiracao = new Date(tenant.data_expiracao);

        if (expiracao < now) {
          // Auto-suspend tenant expirado
          await pool.query(
            "UPDATE tenants SET status = 'suspended' WHERE id = $1",
            [tenant.id],
          );

          return res.status(403).json({
            error: "Plano expirado",
            message: "Sua assinatura expirou. Renove para continuar.",
            data_expiracao: tenant.data_expiracao,
          });
        }
      }

      // 7. Injetar dados do JWT (sem buscar usuário no banco)
      // JWT já foi validado = confiamos nos dados
      req.user = {
        id: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
      };
      req.userId = decoded.userId;
      req.tenant = {
        id: tenant.id,
        status: tenant.status,
      };
      req.tenantId = tenant.id;

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
   * Uso: authMiddleware.requireRole(['admin', 'user'])
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
   * Middleware para validar limites do plano
   * Evita que tenant exceda limites contratados
   */
  async validatePlanLimits(resourceType) {
    return async (req, res, next) => {
      try {
        const tenant = req.tenant;

        // Mapa de limites por tipo de recurso
        const limitChecks = {
          // Limite de orçamentos no mês
          orcamentos: async () => {
            if (!tenant.max_orcamentos_mes) return true;

            const result = await pool.query(
              `SELECT COUNT(*) as total 
               FROM orcamentos 
               WHERE tenant_id = $1 
               AND EXTRACT(MONTH FROM criado_em) = EXTRACT(MONTH FROM CURRENT_DATE)
               AND EXTRACT(YEAR FROM criado_em) = EXTRACT(YEAR FROM CURRENT_DATE)`,
              [tenant.id],
            );

            const total = parseInt(result.rows[0].total);

            if (total >= tenant.max_orcamentos_mes) {
              return {
                blocked: true,
                message: `Limite de ${tenant.max_orcamentos_mes} orçamentos/mês atingido`,
                limite: tenant.max_orcamentos_mes,
                usado: total,
              };
            }

            return true;
          },

          // Limite de usuários
          usuarios: async () => {
            if (!tenant.max_usuarios) return true;

            const result = await pool.query(
              "SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = $1 AND ativo = true",
              [tenant.id],
            );

            const total = parseInt(result.rows[0].total);

            if (total >= tenant.max_usuarios) {
              return {
                blocked: true,
                message: `Limite de ${tenant.max_usuarios} usuários atingido`,
                limite: tenant.max_usuarios,
                usado: total,
              };
            }

            return true;
          },
        };

        // Executar validação do recurso
        const checkFunction = limitChecks[resourceType];

        if (!checkFunction) {
          // Recurso sem limite definido
          return next();
        }

        const result = await checkFunction();

        if (result === true) {
          return next();
        }

        // Limite atingido
        return res.status(429).json({
          error: "Limite do plano atingido",
          ...result,
          plano_atual: tenant.plano,
          upgrade_para: "premium",
        });
      } catch (error) {
        console.error("Erro ao validar limites:", error);
        // Em caso de erro, permite continuar (fail-open)
        next();
      }
    };
  }

  /**
   * Gera JWT token
   */
  generateToken(userId, tenantId, role, expiresIn = "7d") {
    return jwt.sign(
      {
        userId,
        tenantId,
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
