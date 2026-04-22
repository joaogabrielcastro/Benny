import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import produtosService from "../services/produtosService.js";
import logger from "../config/logger.js";
import { paginate } from "../middleware/paginate.js";

class ProdutosController {
  async listar(req, res) {
    try {
      const tenantId = SINGLE_TENANT_ID;
      const { limit, offset, page } = req.pagination;
      const { rows, total } = await produtosService.listar(tenantId, {
        limit,
        offset,
      });
      res.json({
        data: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error("Erro ao listar produtos:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async estoqueBaixo(req, res) {
    try {
      const rows = await produtosService.estoqueBaixo(SINGLE_TENANT_ID);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao buscar estoque baixo:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async diagnostico(req, res) {
    try {
      const data = await produtosService.diagnostico(SINGLE_TENANT_ID);
      res.json(data);
    } catch (error) {
      logger.error("Erro no diagnóstico:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async buscar(req, res) {
    try {
      const { id } = req.params;
      if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

      const produto = await produtosService.buscarPorId(SINGLE_TENANT_ID, id);
      if (!produto)
        return res.status(404).json({ error: "Produto não encontrado" });

      res.json(produto);
    } catch (error) {
      logger.error(`Erro ao buscar produto ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async criar(req, res) {
    try {
      const produto = await produtosService.criar(SINGLE_TENANT_ID, req.body);
      res
        .status(201)
        .json({
          id: produto.id,
          message: "Produto criado com sucesso",
          produto,
        });
    } catch (error) {
      logger.error("Erro ao criar produto:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const produto = await produtosService.atualizar(
        SINGLE_TENANT_ID,
        req.params.id,
        req.body,
      );
      if (!produto)
        return res.status(404).json({ error: "Produto não encontrado" });
      res.json({ message: "Produto atualizado com sucesso", produto });
    } catch (error) {
      logger.error(`Erro ao atualizar produto ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async deletar(req, res) {
    try {
      await produtosService.deletar(SINGLE_TENANT_ID, req.params.id);
      res.json({ message: "Produto deletado com sucesso" });
    } catch (error) {
      logger.error(`Erro ao deletar produto ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ProdutosController();
export { paginate };
