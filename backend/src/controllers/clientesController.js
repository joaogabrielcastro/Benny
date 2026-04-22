import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import clientesService from "../services/clientesService.js";
import logger from "../config/logger.js";

class ClientesController {
  async listar(req, res) {
    try {
      const rows = await clientesService.listar(SINGLE_TENANT_ID, req.query.busca);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar clientes:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async buscar(req, res) {
    try {
      const cliente = await clientesService.buscarPorId(
        SINGLE_TENANT_ID,
        req.params.id,
      );
      if (!cliente)
        return res.status(404).json({ error: "Cliente não encontrado" });
      res.json(cliente);
    } catch (error) {
      logger.error(`Erro ao buscar cliente ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async criar(req, res) {
    try {
      const cliente = await clientesService.criar(SINGLE_TENANT_ID, req.body);
      res
        .status(201)
        .json({ id: cliente.id, message: "Cliente criado com sucesso" });
    } catch (error) {
      logger.error("Erro ao criar cliente:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      await clientesService.atualizar(SINGLE_TENANT_ID, req.params.id, req.body);
      res.json({ message: "Cliente atualizado com sucesso" });
    } catch (error) {
      logger.error(`Erro ao atualizar cliente ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ClientesController();
