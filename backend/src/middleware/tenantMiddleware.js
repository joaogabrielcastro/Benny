/**
 * Middleware para identificar e validar o tenant (organização)
 * Suporta múltiplas formas de identificação:
 * 1. Subdomain: oficina1.seudominio.com
 * 2. Header: X-Tenant-ID ou X-Tenant-Slug
 * 3. JWT token (tenant_id no payload)
 */

import pool from "../../database.js";

class TenantMiddleware {
  /**
   * Extrai tenant_id ou slug da requisição
   */
  async extractTenant(req, res, next) {
    try {
      let tenantIdentifier = null;
      let identifierType = null;

      // 1. Tentar pegar do header X-Tenant-ID (prioritário)
      if (req.headers["x-tenant-id"]) {
        tenantIdentifier = req.headers["x-tenant-id"];
        identifierType = "id";
      }
      // 2. Tentar pegar do header X-Tenant-Slug
      else if (req.headers["x-tenant-slug"]) {
        tenantIdentifier = req.headers["x-tenant-slug"];
        identifierType = "slug";
      }
      // 3. Tentar extrair do subdomain
      else if (!tenantIdentifier) {
        const host = req.headers.host || req.hostname;
        const subdomain = this.extractSubdomain(host);

        if (subdomain && subdomain !== "www" && subdomain !== "api") {
          tenantIdentifier = subdomain;
          identifierType = "slug";
        }
      }
      // 4. Tentar pegar do JWT (se implementado - futuro)
      if (!tenantIdentifier && req.user && req.user.tenant_id) {
        tenantIdentifier = req.user.tenant_id;
        identifierType = "id";
      }

      // Se não encontrou nenhum identificador
      if (!tenantIdentifier) {
        return res.status(400).json({
          error: "Tenant não identificado",
          message:
            "Forneça X-Tenant-ID, X-Tenant-Slug no header ou use subdomain",
        });
      }

      // Buscar tenant no banco
      const tenant = await this.getTenant(tenantIdentifier, identifierType);

      if (!tenant) {
        return res.status(404).json({
          error: "Tenant não encontrado",
          message: `Organização '${tenantIdentifier}' não existe`,
        });
      }

      // Validar status do tenant
      if (tenant.status !== "active") {
        return res.status(403).json({
          error: "Tenant inativo",
          message: `Organização está ${tenant.status}`,
        });
      }

      // Validar expiração (se houver)
      if (tenant.data_expiracao) {
        const now = new Date();
        const expiracao = new Date(tenant.data_expiracao);
        if (expiracao < now) {
          return res.status(403).json({
            error: "Tenant expirado",
            message: "A licença desta organização expirou",
          });
        }
      }

      // Injetar tenant no request para uso posterior
      req.tenant = tenant;
      req.tenantId = tenant.id;

      next();
    } catch (error) {
      console.error("Erro no tenant middleware:", error);
      return res.status(500).json({
        error: "Erro ao processar tenant",
        message: error.message,
      });
    }
  }

  /**
   * Extrai subdomain do host
   * Exemplo: oficina1.meusistema.com → oficina1
   */
  extractSubdomain(host) {
    // Remover porta se houver
    const hostname = host.split(":")[0];
    const parts = hostname.split(".");

    // Se tiver 3+ partes, o primeiro é o subdomain
    // Ex: oficina1.meusistema.com
    if (parts.length >= 3) {
      return parts[0];
    }

    // Localhost ou domínio único
    return null;
  }

  /**
   * Busca tenant no banco de dados
   */
  async getTenant(identifier, type = "id") {
    const query =
      type === "id"
        ? "SELECT * FROM tenants WHERE id = $1"
        : "SELECT * FROM tenants WHERE slug = $1";

    const result = await pool.query(query, [identifier]);
    return result.rows[0];
  }

  /**
   * Middleware opcional para rotas públicas (não exige tenant)
   */
  async extractTenantOptional(req, res, next) {
    try {
      await this.extractTenant(req, res, () => {});
    } catch (error) {
      console.warn("Tenant não fornecido (opcional):", error.message);
    }
    next();
  }

  /**
   * Middleware para validar permissões de plano
   * Uso: tenantMiddleware.requirePlan(['premium', 'enterprise'])
   */
  requirePlan(allowedPlans = []) {
    return (req, res, next) => {
      if (!req.tenant) {
        return res.status(401).json({ error: "Tenant não autenticado" });
      }

      if (!allowedPlans.includes(req.tenant.plano)) {
        return res.status(403).json({
          error: "Plano insuficiente",
          message: `Esta funcionalidade requer plano: ${allowedPlans.join(" ou ")}`,
          planoAtual: req.tenant.plano,
        });
      }

      next();
    };
  }

  /**
   * Middleware para validar limites de uso
   * Exemplo: limites de orçamentos por mês
   */
  async validateUsageLimits(req, res, next) {
    try {
      const tenant = req.tenant;

      // Exemplo: validar limite de orçamentos no mês atual
      if (tenant.max_orcamentos_mes) {
        const result = await pool.query(
          `SELECT COUNT(*) as total 
           FROM orcamentos 
           WHERE tenant_id = $1 
           AND EXTRACT(MONTH FROM criado_em) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(YEAR FROM criado_em) = EXTRACT(YEAR FROM CURRENT_DATE)`,
          [tenant.id],
        );

        const totalOrcamentos = parseInt(result.rows[0].total);

        if (totalOrcamentos >= tenant.max_orcamentos_mes) {
          return res.status(429).json({
            error: "Limite excedido",
            message: `Você atingiu o limite de ${tenant.max_orcamentos_mes} orçamentos por mês`,
            limite: tenant.max_orcamentos_mes,
            usado: totalOrcamentos,
          });
        }
      }

      next();
    } catch (error) {
      console.error("Erro ao validar limites:", error);
      next(); // Continua mesmo com erro na validação
    }
  }
}

export default new TenantMiddleware();
