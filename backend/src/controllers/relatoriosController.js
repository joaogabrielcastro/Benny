import relatoriosService from "../services/relatoriosService.js";
import logger from "../config/logger.js";

class RelatoriosController {
  async dashboard(req, res) {
    try {
      const data = await relatoriosService.dashboard(req.tenantId);
      res.json(data);
    } catch (error) {
      logger.error("Erro ao gerar dashboard:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async vendas(req, res) {
    try {
      const { dataInicio, dataFim } = req.query;
      const data = await relatoriosService.vendas(
        req.tenantId,
        dataInicio,
        dataFim,
      );
      res.json(data);
    } catch (error) {
      logger.error("Erro ao gerar relatório de vendas:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new RelatoriosController();
