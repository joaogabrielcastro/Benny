import orcamentosService from "../services/orcamentosService.js";
import logger from "../config/logger.js";

class OrcamentosController {
  async listar(req, res) {
    try {
      const rows = await orcamentosService.listar(req.tenantId, req.query);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar orçamentos:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async buscar(req, res) {
    try {
      const orc = await orcamentosService.buscarPorId(
        req.tenantId,
        req.params.id,
      );
      if (!orc)
        return res.status(404).json({ error: "Orçamento não encontrado" });
      res.json(orc);
    } catch (error) {
      logger.error(`Erro ao buscar orçamento ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async buscarPublico(req, res) {
    try {
      const orc = await orcamentosService.buscarPorToken(req.params.token);
      if (!orc)
        return res.status(404).json({ error: "Orçamento não encontrado" });
      res.json(orc);
    } catch (error) {
      logger.error(
        `Erro ao buscar orçamento público ${req.params.token}:`,
        error,
      );
      res.status(500).json({ error: error.message });
    }
  }

  async criar(req, res) {
    try {
      const result = await orcamentosService.criar(req.tenantId, req.body);
      res
        .status(201)
        .json({ ...result, message: "Orçamento criado com sucesso" });
    } catch (error) {
      logger.error("Erro ao criar orçamento:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async atualizar(req, res) {
    try {
      const result = await orcamentosService.atualizar(
        req.tenantId,
        req.params.id,
        req.body,
      );
      if (!result)
        return res.status(404).json({ error: "Orçamento não encontrado" });
      res.json({ message: "Orçamento atualizado com sucesso" });
    } catch (error) {
      logger.error(`Erro ao atualizar orçamento ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async aprovarPublico(req, res) {
    try {
      const orc = await orcamentosService.aprovarPorToken(req.params.token);
      if (!orc)
        return res.status(404).json({ error: "Orçamento não encontrado" });
      res.json({ message: "Orçamento aprovado com sucesso", orcamento: orc });
    } catch (error) {
      logger.error(`Erro ao aprovar orçamento ${req.params.token}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async reprovarPublico(req, res) {
    try {
      const orc = await orcamentosService.reprovarPorToken(req.params.token);
      if (!orc)
        return res.status(404).json({ error: "Orçamento não encontrado" });
      res.json({ message: "Orçamento reprovado", orcamento: orc });
    } catch (error) {
      logger.error(`Erro ao reprovar orçamento ${req.params.token}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async converterEmOS(req, res) {
    try {
      const result = await orcamentosService.converterEmOS(
        req.tenantId,
        req.params.id,
      );
      if (!result)
        return res.status(404).json({ error: "Orçamento não encontrado" });
      res
        .status(201)
        .json({ ...result, message: "Orçamento convertido em OS com sucesso" });
    } catch (error) {
      if (error.code === "STATUS_INVALIDO") {
        return res.status(400).json({ error: error.message });
      }
      logger.error(`Erro ao converter orçamento ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default new OrcamentosController();
