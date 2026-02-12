/**
 * Service de Métricas por Tenant
 * 
 * FOCO: Dados que ajudam a tomar decisões de negócio
 * - Quem está usando muito? (upsell)
 * - Quem está usando pouco? (churn risk)
 * - Quando foi o último acesso? (engagement)
 */

import pool from "../../database.js";

class MetricsService {
  /**
   * Dashboard/Overview do tenant
   * Tudo que o tenant precisa ver logo no login
   */
  async getDashboard(tenantId) {
    const [
      clientes,
      veiculos,
      orcamentos,
      ordens,
      produtos,
      usuarios,
      orcamentosMes,
      receitaMes,
      receitaTotal,
    ] = await Promise.all([
      this._countClientes(tenantId),
      this._countVeiculos(tenantId),
      this._countOrcamentos(tenantId),
      this._countOrdens(tenantId),
      this._countProdutos(tenantId),
      this._countUsuarios(tenantId),
      this._countOrcamentosMes(tenantId),
      this._receitaMes(tenantId),
      this._receitaTotal(tenantId),
    ]);

    return {
      clientes: {
        total: clientes,
      },
      veiculos: {
        total: veiculos,
      },
      orcamentos: {
        total: orcamentos,
        mes_atual: orcamentosMes,
      },
      ordens_servico: {
        total: ordens,
      },
      produtos: {
        total: produtos,
      },
      usuarios: {
        total: usuarios,
      },
      receita: {
        mes_atual: parseFloat(receitaMes || 0),
        total: parseFloat(receitaTotal || 0),
      },
    };
  }

  /**
   * Métricas para ADMIN GLOBAL
   * Tudo que você precisa para gerenciar o SaaS
   */
  async getAdminMetrics() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(*) FILTER (WHERE status = 'active') as tenants_ativos,
        COUNT(*) FILTER (WHERE status = 'suspended') as tenants_suspensos,
        COUNT(*) FILTER (WHERE plano = 'basic') as plano_basic,
        COUNT(*) FILTER (WHERE plano = 'premium') as plano_premium,
        COUNT(*) FILTER (WHERE plano = 'enterprise') as plano_enterprise,
        (SELECT COUNT(*) FROM usuarios WHERE ativo = true) as total_usuarios,
        (SELECT COUNT(*) FROM ordens_servico) as total_ordens,
        (SELECT SUM(valor_total) FROM ordens_servico WHERE status = 'Finalizada') as receita_total
      FROM tenants
    `);

    return result.rows[0];
  }

  /**
   * Ranking de tenants por uso
   * TOP 10 que mais usam (candidatos a upsell)
   */
  async getTopTenants() {
    const result = await pool.query(`
      SELECT 
        t.id,
        t.nome,
        t.slug,
        t.plano,
        (SELECT COUNT(*) FROM ordens_servico WHERE tenant_id = t.id) as total_ordens,
        (SELECT COUNT(*) FROM orcamentos WHERE tenant_id = t.id) as total_orcamentos,
        (SELECT COUNT(*) FROM clientes WHERE tenant_id = t.id) as total_clientes,
        (SELECT SUM(valor_total) FROM ordens_servico WHERE tenant_id = t.id AND status = 'Finalizada') as receita_total,
        t.criado_em
      FROM tenants t
      WHERE t.status = 'active'
      ORDER BY (SELECT COUNT(*) FROM ordens_servico WHERE tenant_id = t.id) DESC
      LIMIT 10
    `);

    return result.rows;
  }

  /**
   * Tenants em risco de churn
   * Sem atividade nos últimos 7 dias
   */
  async getChurnRisk() {
    const result = await pool.query(`
      SELECT 
        t.id,
        t.nome,
        t.email,
        t.plano,
        MAX(u.ultimo_login) as ultimo_login,
        (SELECT COUNT(*) FROM ordens_servico WHERE tenant_id = t.id) as total_ordens
      FROM tenants t
      LEFT JOIN usuarios u ON u.tenant_id = t.id
      WHERE t.status = 'active'
      GROUP BY t.id
      HAVING MAX(u.ultimo_login) < NOW() - INTERVAL '7 days' OR MAX(u.ultimo_login) IS NULL
      ORDER BY MAX(u.ultimo_login) ASC
    `);

    return result.rows;
  }

  /**
   * Crescimento mensal
   * Novos tenants por mês
   */
  async getGrowth() {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(criado_em, 'YYYY-MM') as mes,
        COUNT(*) as novos_tenants,
        COUNT(*) FILTER (WHERE plano = 'basic') as basic,
        COUNT(*) FILTER (WHERE plano = 'premium') as premium
      FROM tenants
      WHERE criado_em >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(criado_em, 'YYYY-MM')
      ORDER BY mes DESC
    `);

    return result.rows;
  }

  /**
   * Uso de limites por tenant
   * Quem está próximo de bater no limite? (oportunidade de upsell)
   */
  async getLimitUsage(tenantId) {
    const tenant = await pool.query("SELECT * FROM tenants WHERE id = $1", [
      tenantId,
    ]);

    if (tenant.rows.length === 0) return null;

    const t = tenant.rows[0];

    // Contar uso atual
    const [usuarios, orcamentosMes] = await Promise.all([
      pool.query(
        "SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = $1 AND ativo = true",
        [tenantId],
      ),
      pool.query(
        `SELECT COUNT(*) as total FROM orcamentos 
         WHERE tenant_id = $1 
         AND EXTRACT(MONTH FROM criado_em) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM criado_em) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [tenantId],
      ),
    ]);

    return {
      usuarios: {
        usado: parseInt(usuarios.rows[0].total),
        limite: t.max_usuarios,
        percentual:
          t.max_usuarios > 0
            ? Math.round((parseInt(usuarios.rows[0].total) / t.max_usuarios) * 100)
            : 0,
      },
      orcamentos_mes: {
        usado: parseInt(orcamentosMes.rows[0].total),
        limite: t.max_orcamentos_mes,
        percentual:
          t.max_orcamentos_mes > 0
            ? Math.round(
                (parseInt(orcamentosMes.rows[0].total) / t.max_orcamentos_mes) * 100,
              )
            : 0,
      },
    };
  }

  // ==========================================
  // MÉTODOS PRIVADOS (helpers)
  // ==========================================

  async _countClientes(tenantId) {
    const result = await pool.query(
      "SELECT COUNT(*) as total FROM clientes WHERE tenant_id = $1",
      [tenantId],
    );
    return parseInt(result.rows[0].total);
  }

  async _countVeiculos(tenantId) {
    const result = await pool.query(
      "SELECT COUNT(*) as total FROM veiculos WHERE tenant_id = $1",
      [tenantId],
    );
    return parseInt(result.rows[0].total);
  }

  async _countOrcamentos(tenantId) {
    const result = await pool.query(
      "SELECT COUNT(*) as total FROM orcamentos WHERE tenant_id = $1",
      [tenantId],
    );
    return parseInt(result.rows[0].total);
  }

  async _countOrdens(tenantId) {
    const result = await pool.query(
      "SELECT COUNT(*) as total FROM ordens_servico WHERE tenant_id = $1",
      [tenantId],
    );
    return parseInt(result.rows[0].total);
  }

  async _countProdutos(tenantId) {
    const result = await pool.query(
      "SELECT COUNT(*) as total FROM produtos WHERE tenant_id = $1",
      [tenantId],
    );
    return parseInt(result.rows[0].total);
  }

  async _countUsuarios(tenantId) {
    const result = await pool.query(
      "SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = $1 AND ativo = true",
      [tenantId],
    );
    return parseInt(result.rows[0].total);
  }

  async _countOrcamentosMes(tenantId) {
    const result = await pool.query(
      `SELECT COUNT(*) as total FROM orcamentos 
       WHERE tenant_id = $1 
       AND EXTRACT(MONTH FROM criado_em) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM criado_em) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [tenantId],
    );
    return parseInt(result.rows[0].total);
  }

  async _receitaMes(tenantId) {
    const result = await pool.query(
      `SELECT SUM(valor_total) as total FROM ordens_servico 
       WHERE tenant_id = $1 
       AND status = 'Finalizada'
       AND EXTRACT(MONTH FROM finalizado_em) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM finalizado_em) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [tenantId],
    );
    return result.rows[0].total;
  }

  async _receitaTotal(tenantId) {
    const result = await pool.query(
      "SELECT SUM(valor_total) as total FROM ordens_servico WHERE tenant_id = $1 AND status = 'Finalizada'",
      [tenantId],
    );
    return result.rows[0].total;
  }
}

export default new MetricsService();
