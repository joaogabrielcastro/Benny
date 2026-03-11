import ordensServicoService from "../services/ordensServicoService.js";
import logger from "../config/logger.js";

class OrdensServicoController {
  async listar(req, res) {
    try {
      const rows = await ordensServicoService.listar(req.tenantId, req.query);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar ordens de serviço:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async buscar(req, res) {
    try {
      const os = await ordensServicoService.buscarPorId(
        req.tenantId,
        req.params.id,
      );
      if (!os) return res.status(404).json({ error: "OS não encontrada" });
      res.json(os);
    } catch (error) {
      logger.error(`Erro ao buscar OS ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async criar(req, res) {
    try {
      const result = await ordensServicoService.criar(req.tenantId, req.body);
      res.status(201).json({ ...result, message: "OS criada com sucesso" });
    } catch (error) {
      logger.error("Erro ao criar OS:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const result = await ordensServicoService.atualizar(
        req.tenantId,
        req.params.id,
        req.body,
      );
      if (!result) return res.status(404).json({ error: "OS não encontrada" });
      res.json({ message: "OS atualizada com sucesso" });
    } catch (error) {
      logger.error(`Erro ao atualizar OS ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new OrdensServicoController();
