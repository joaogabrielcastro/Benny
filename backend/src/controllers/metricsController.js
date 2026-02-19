/**
 * Controller de Métricas
 */

import metricsService from "../services/metricsService.js";

class MetricsController {
  /**
   * GET /api/metrics/dashboard
   * Dashboard do tenant autenticado
   */
  async dashboard(req, res) {
    try {
      const metrics = await metricsService.getDashboard(req.tenantId);

      res.json(metrics);
    } catch (error) {
      console.error("Erro ao buscar dashboard:", error);
      res.status(500).json({
        error: "Erro ao buscar métricas",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/metrics/limits
   * Uso de limites do plano
   */
  async limits(req, res) {
    try {
      const usage = await metricsService.getLimitUsage(req.tenantId);

      res.json(usage);
    } catch (error) {
      console.error("Erro ao buscar limites:", error);
      res.status(500).json({
        error: "Erro ao buscar limites",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/metrics/admin
   * Métricas globais (apenas super admin)
   */
  async adminMetrics(req, res) {
    try {
      const metrics = await metricsService.getAdminMetrics();

      res.json(metrics);
    } catch (error) {
      console.error("Erro ao buscar métricas admin:", error);
      res.status(500).json({
        error: "Erro ao buscar métricas",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/metrics/admin/top-tenants
   * Ranking de tenants
   */
  async topTenants(req, res) {
    try {
      const tenants = await metricsService.getTopTenants();

      res.json({
        total: tenants.length,
        tenants,
      });
    } catch (error) {
      console.error("Erro ao buscar top tenants:", error);
      res.status(500).json({
        error: "Erro ao buscar ranking",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/metrics/admin/churn-risk
   * Tenants em risco de churn
   */
  async churnRisk(req, res) {
    try {
      const tenants = await metricsService.getChurnRisk();

      res.json({
        total: tenants.length,
        tenants,
      });
    } catch (error) {
      console.error("Erro ao buscar churn risk:", error);
      res.status(500).json({
        error: "Erro ao buscar tenants em risco",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/metrics/admin/growth
   * Crescimento mensal
   */
  async growth(req, res) {
    try {
      const data = await metricsService.getGrowth();

      res.json({
        meses: data.length,
        dados: data,
      });
    } catch (error) {
      console.error("Erro ao buscar crescimento:", error);
      res.status(500).json({
        error: "Erro ao buscar dados de crescimento",
        message: error.message,
      });
    }
  }
}

export default new MetricsController();
