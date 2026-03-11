import veiculosService from "../services/veiculosService.js";
import logger from "../config/logger.js";

class VeiculosController {
  async listar(req, res) {
    try {
      const rows = await veiculosService.listar(req.tenantId);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar veículos:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async listarPorCliente(req, res) {
    try {
      const rows = await veiculosService.listarPorCliente(
        req.tenantId,
        req.params.clienteId,
      );
      res.json(rows);
    } catch (error) {
      logger.error(
        `Erro ao listar veículos do cliente ${req.params.clienteId}:`,
        error,
      );
      res.status(500).json({ error: error.message });
    }
  }

  async criar(req, res) {
    try {
      const veiculo = await veiculosService.criar(req.tenantId, req.body);
      res
        .status(201)
        .json({ id: veiculo.id, message: "Veículo criado com sucesso" });
    } catch (error) {
      logger.error("Erro ao criar veículo:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new VeiculosController();
