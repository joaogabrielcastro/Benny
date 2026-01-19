import lembretesService from "../services/lembretesService.js";
import logger from "../config/logger.js";

class LembretesController {
  async listar(req, res) {
    try {
      const filtros = req.query || {};
      const rows = await lembretesService.listar(filtros);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar lembretes:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async hoje(req, res) {
    try {
      const rows = await lembretesService.hoje();
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar lembretes de hoje:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async marcarEnviado(req, res) {
    try {
      const lembrete = await lembretesService.marcarEnviado(req.params.id);
      if (!lembrete) return res.status(404).json({ error: "Lembrete não encontrado" });
      res.json({ message: "Lembrete marcado como enviado", lembrete });
    } catch (error) {
      logger.error("Erro ao marcar lembrete como enviado:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new LembretesController();
