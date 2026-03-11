import servicosService from "../services/servicosService.js";
import logger from "../config/logger.js";

class ServicosController {
  async listar(req, res) {
    try {
      const rows = await servicosService.listar(req.tenantId);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar serviços:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async buscar(req, res) {
    try {
      const servico = await servicosService.buscarPorId(
        req.tenantId,
        req.params.id,
      );
      if (!servico)
        return res.status(404).json({ error: "Serviço não encontrado" });
      res.json(servico);
    } catch (error) {
      logger.error(`Erro ao buscar serviço ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async criar(req, res) {
    try {
      const servico = await servicosService.criar(req.tenantId, req.body);
      res.status(201).json({ servico, message: "Serviço criado" });
    } catch (error) {
      logger.error("Erro ao criar serviço:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const servico = await servicosService.atualizar(
        req.tenantId,
        req.params.id,
        req.body,
      );
      if (!servico)
        return res.status(404).json({ error: "Serviço não encontrado" });
      res.json({ servico, message: "Serviço atualizado" });
    } catch (error) {
      logger.error(`Erro ao atualizar serviço ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async deletar(req, res) {
    try {
      await servicosService.deletar(req.tenantId, req.params.id);
      res.json({ message: "Serviço deletado com sucesso" });
    } catch (error) {
      logger.error(`Erro ao deletar serviço ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ServicosController();
