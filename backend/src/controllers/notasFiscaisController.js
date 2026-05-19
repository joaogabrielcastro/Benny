import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import logger from "../config/logger.js";
import notasFiscaisService from "../services/notasFiscaisService.js";

class NotasFiscaisController {
  async listar(req, res) {
    try {
      const rows = await notasFiscaisService.listar(SINGLE_TENANT_ID);
      res.json(rows);
    } catch (error) {
      logger.error("Erro ao listar notas fiscais:", error);
      res.status(500).json({ erro: error.message });
    }
  }

  async buscar(req, res) {
    try {
      const row = await notasFiscaisService.buscarPorId(
        SINGLE_TENANT_ID,
        req.params.id,
      );
      if (!row) return res.status(404).json({ erro: "Nota fiscal não encontrada" });
      res.json(notasFiscaisService.mapNfParaRespostaApi(row));
    } catch (error) {
      logger.error(`Erro ao buscar NF ${req.params.id}:`, error);
      res.status(500).json({ erro: error.message });
    }
  }

  async listarPorOs(req, res) {
    try {
      const rows = await notasFiscaisService.listarPorOs(
        SINGLE_TENANT_ID,
        req.params.osId,
      );
      res.json(rows.map(notasFiscaisService.mapNfParaRespostaApi));
    } catch (error) {
      logger.error(`Erro ao listar NF da OS ${req.params.osId}:`, error);
      res.status(500).json({ erro: error.message });
    }
  }

  async sincronizarPorOs(req, res) {
    try {
      const modelo =
        req.params.modelo?.toUpperCase() === "NFE" ? "NFE" : "NFSE";
      const result = await notasFiscaisService.sincronizarPorOs(
        SINGLE_TENANT_ID,
        req.params.osId,
        modelo,
      );
      if (result.erro) {
        return res.status(400).json({ erro: result.erro });
      }
      res.json({
        message: result.message,
        nf: result.nf,
      });
    } catch (error) {
      logger.error(`Erro ao sincronizar NF da OS ${req.params.osId}:`, error);
      res.status(500).json({ erro: error.message });
    }
  }

  async gerar(req, res) {
    try {
      const forcarNovaEmissao =
        req.query.forcar === "1" || req.query.forcar === "true";
      const modeloParam = (
        req.params.modelo ||
        req.query.modelo ||
        "NFSE"
      ).toUpperCase();
      const modeloDocumento = modeloParam === "NFE" ? "NFE" : "NFSE";
      const result = await notasFiscaisService.gerarParaOs(
        SINGLE_TENANT_ID,
        req.params.osId,
        { forcarNovaEmissao, modeloDocumento },
      );
      if (result.erro) {
        return res.status(400).json({ erro: result.erro });
      }
      res.status(201).json({
        message: result.message,
        nf: result.nf,
      });
    } catch (error) {
      logger.error(`Erro ao gerar NF para OS ${req.params.osId}:`, error);
      res.status(500).json({ erro: error.message });
    }
  }

  async cancelar(req, res) {
    res.status(501).json({
      erro:
        "Cancelamento de NFS-e via Nuvem Fiscal ainda não implementado. Use o painel da Nuvem Fiscal se necessário.",
    });
  }
}

export default new NotasFiscaisController();
