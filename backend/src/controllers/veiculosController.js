import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import veiculosService from "../services/veiculosService.js";
import { consultarVeiculoPorPlaca } from "../services/placaLookupService.js";
import logger from "../config/logger.js";

class VeiculosController {
  async listar(req, res) {
    try {
      const rows = await veiculosService.listar(SINGLE_TENANT_ID);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar veículos:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async listarPorCliente(req, res) {
    try {
      const rows = await veiculosService.listarPorCliente(
        SINGLE_TENANT_ID,
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
      const veiculo = await veiculosService.criar(SINGLE_TENANT_ID, req.body);
      res
        .status(201)
        .json({ id: veiculo.id, message: "Veículo criado com sucesso" });
    } catch (error) {
      logger.error("Erro ao criar veículo:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async consultarPlaca(req, res) {
    try {
      const resultado = await consultarVeiculoPorPlaca(req.params.placa);
      if (!resultado.ok) {
        return res.status(400).json({ erro: resultado.erro });
      }
      const { ok: _ok, ...dados } = resultado;
      res.json(dados);
    } catch (error) {
      logger.error("Erro ao consultar placa:", error);
      res.status(500).json({ erro: error.message });
    }
  }
}

export default new VeiculosController();
