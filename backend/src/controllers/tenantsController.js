/**
 * Controller para gerenciar Tenants
 */

import tenantsService from "../services/tenantsService.js";

class TenantsController {
  /**
   * POST /api/tenants - Criar novo tenant
   * Apenas admin global pode criar tenants
   */
  async criar(req, res) {
    try {
      const data = req.body;

      // Validações básicas
      if (!data.slug || !data.nome || !data.email) {
        return res.status(400).json({
          error: "Dados incompletos",
          message: "slug, nome e email são obrigatórios",
        });
      }

      // Validar slug
      const slugDisponivel = await tenantsService.slugDisponivel(data.slug);
      if (!slugDisponivel) {
        return res.status(400).json({
          error: "Slug já existe",
          message: "Este identificador já está em uso",
        });
      }

      const tenant = await tenantsService.criarTenant(data);

      res.status(201).json({
        message: "Tenant criado com sucesso",
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          nome: tenant.nome,
          status: tenant.status,
          plano: tenant.plano,
        },
      });
    } catch (error) {
      console.error("Erro ao criar tenant:", error);
      res.status(500).json({
        error: "Erro ao criar tenant",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tenants - Listar todos os tenants
   */
  async listar(req, res) {
    try {
      const filters = {
        status: req.query.status,
        plano: req.query.plano,
        busca: req.query.busca,
        limit: req.query.limit ? parseInt(req.query.limit) : null,
      };

      const tenants = await tenantsService.listarTenants(filters);

      res.json({
        total: tenants.length,
        tenants,
      });
    } catch (error) {
      console.error("Erro ao listar tenants:", error);
      res.status(500).json({
        error: "Erro ao listar tenants",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tenants/:id - Buscar tenant por ID
   */
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const tenant = await tenantsService.buscarPorId(id);

      if (!tenant) {
        return res.status(404).json({
          error: "Tenant não encontrado",
        });
      }

      res.json(tenant);
    } catch (error) {
      console.error("Erro ao buscar tenant:", error);
      res.status(500).json({
        error: "Erro ao buscar tenant",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tenants/slug/:slug - Buscar tenant por slug
   */
  async buscarPorSlug(req, res) {
    try {
      const { slug } = req.params;
      const tenant = await tenantsService.buscarPorSlug(slug);

      if (!tenant) {
        return res.status(404).json({
          error: "Tenant não encontrado",
        });
      }

      res.json(tenant);
    } catch (error) {
      console.error("Erro ao buscar tenant:", error);
      res.status(500).json({
        error: "Erro ao buscar tenant",
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/tenants/:id - Atualizar tenant
   */
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const tenant = await tenantsService.atualizarTenant(id, data);

      if (!tenant) {
        return res.status(404).json({
          error: "Tenant não encontrado",
        });
      }

      res.json({
        message: "Tenant atualizado com sucesso",
        tenant,
      });
    } catch (error) {
      console.error("Erro ao atualizar tenant:", error);
      res.status(500).json({
        error: "Erro ao atualizar tenant",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/tenants/:id/suspend - Suspender tenant
   */
  async suspender(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const tenant = await tenantsService.suspenderTenant(id, motivo);

      res.json({
        message: "Tenant suspenso com sucesso",
        tenant,
      });
    } catch (error) {
      console.error("Erro ao suspender tenant:", error);
      res.status(500).json({
        error: "Erro ao suspender tenant",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/tenants/:id/reactivate - Reativar tenant
   */
  async reativar(req, res) {
    try {
      const { id } = req.params;

      const tenant = await tenantsService.reativarTenant(id);

      res.json({
        message: "Tenant reativado com sucesso",
        tenant,
      });
    } catch (error) {
      console.error("Erro ao reativar tenant:", error);
      res.status(500).json({
        error: "Erro ao reativar tenant",
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/tenants/:id - Deletar tenant
   */
  async deletar(req, res) {
    try {
      const { id } = req.params;

      const tenant = await tenantsService.deletarTenant(id);

      res.json({
        message: "Tenant cancelado com sucesso",
        tenant,
      });
    } catch (error) {
      console.error("Erro ao deletar tenant:", error);
      res.status(500).json({
        error: "Erro ao deletar tenant",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tenants/:id/stats - Estatísticas do tenant
   */
  async estatisticas(req, res) {
    try {
      const tenantId = req.params.id || req.tenantId;

      const stats = await tenantsService.obterEstatisticas(tenantId);

      res.json(stats);
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      res.status(500).json({
        error: "Erro ao obter estatísticas",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/tenants/current - Obter tenant atual (do middleware)
   */
  async obterAtual(req, res) {
    try {
      if (!req.tenant) {
        return res.status(401).json({
          error: "Tenant não identificado",
        });
      }

      res.json(req.tenant);
    } catch (error) {
      console.error("Erro ao obter tenant atual:", error);
      res.status(500).json({
        error: "Erro ao obter tenant",
        message: error.message,
      });
    }
  }
}

export default new TenantsController();
