/**
 * EXEMPLO: Controller adaptado para Multi-Tenant
 * 
 * Mostra como atualizar controllers para usar req.tenantId
 */

import empresasService from "../services/empresasService.EXAMPLE.js";

class EmpresasController {
  /**
   * ANTES (sem multi-tenant):
   * async criar(req, res) {
   *   const empresa = await empresasService.criarEmpresa(req.body);
   *   res.json(empresa);
   * }
   * 
   * DEPOIS (com multi-tenant):
   */
  async criar(req, res) {
    try {
      // req.tenantId vem do middleware tenantMiddleware
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: "Tenant não identificado",
          message: "Configure o header X-Tenant-ID ou use subdomain",
        });
      }

      // Passar tenantId para o service
      const empresa = await empresasService.criarEmpresa(req.body, tenantId);

      res.status(201).json({
        message: "Empresa criada com sucesso",
        empresa,
      });
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
      res.status(500).json({
        error: "Erro ao criar empresa",
        message: error.message,
      });
    }
  }

  /**
   * Listar empresas do tenant
   */
  async listar(req, res) {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: "Tenant não identificado",
        });
      }

      // Passar tenantId - só retorna empresas do tenant atual
      const empresas = await empresasService.listar(tenantId);

      res.json({
        total: empresas.length,
        empresas,
      });
    } catch (error) {
      console.error("Erro ao listar empresas:", error);
      res.status(500).json({
        error: "Erro ao listar empresas",
        message: error.message,
      });
    }
  }

  /**
   * Buscar empresa por ID
   */
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: "Tenant não identificado",
        });
      }

      // IMPORTANTE: Passar tenantId previne acesso cross-tenant!
      const empresa = await empresasService.buscarPorId(id, tenantId);

      if (!empresa) {
        return res.status(404).json({
          error: "Empresa não encontrada",
          message:
            "A empresa não existe ou não pertence a esta organização",
        });
      }

      res.json(empresa);
    } catch (error) {
      console.error("Erro ao buscar empresa:", error);
      res.status(500).json({
        error: "Erro ao buscar empresa",
        message: error.message,
      });
    }
  }

  /**
   * Atualizar empresa
   */
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: "Tenant não identificado",
        });
      }

      const empresa = await empresasService.atualizarEmpresa(
        id,
        req.body,
        tenantId,
      );

      if (!empresa) {
        return res.status(404).json({
          error: "Empresa não encontrada",
        });
      }

      res.json({
        message: "Empresa atualizada com sucesso",
        empresa,
      });
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      res.status(500).json({
        error: "Erro ao atualizar empresa",
        message: error.message,
      });
    }
  }

  /**
   * Deletar empresa
   */
  async deletar(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: "Tenant não identificado",
        });
      }

      const empresa = await empresasService.deletarEmpresa(id, tenantId);

      if (!empresa) {
        return res.status(404).json({
          error: "Empresa não encontrada",
        });
      }

      res.json({
        message: "Empresa deletada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao deletar empresa:", error);
      res.status(500).json({
        error: "Erro ao deletar empresa",
        message: error.message,
      });
    }
  }
}

export default new EmpresasController();

/**
 * CHECKLIST para adaptar controllers:
 * 
 * 1. ✅ Validar req.tenantId no início de cada método
 * 2. ✅ Passar req.tenantId para TODOS os métodos do service
 * 3. ✅ Retornar erro 401 se tenantId não existir
 * 4. ✅ Mensagens de erro amigáveis
 * 5. ✅ Nunca expor que um recurso existe em outro tenant (404 sempre)
 */
