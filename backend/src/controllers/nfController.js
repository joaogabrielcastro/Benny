import nfService from "../services/nfService.js";
import logger from "../config/logger.js";

class NFController {
  /**
   * Gera NF para uma OS
   * POST /api/notas-fiscais/gerar/:osId
   */
  async gerarNF(req, res) {
    try {
      const { osId } = req.params;

      if (!osId) {
        return res.status(400).json({ error: "ID da OS é obrigatório" });
      }

      const nf = await nfService.gerarNF(osId);

      const message = nf.pdf_path
        ? "Nota Fiscal gerada (manual). Abra o resumo em /api/storage/ e imprima/copiar os dados."
        : "Nota Fiscal enfileirada para emissão";

      res.status(201).json({ message, nf });
    } catch (error) {
      logger.error(`Erro ao gerar NF:`, error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Busca NF por ID
   * GET /api/notas-fiscais/:id
   */
  async buscarNF(req, res) {
    try {
      const { id } = req.params;

      const nf = await nfService.buscarNFPorId(id);

      res.json(nf);
    } catch (error) {
      logger.error(`Erro ao buscar NF:`, error);
      res.status(404).json({ error: error.message });
    }
  }

  /**
   * Lista todas as NFs
   * GET /api/notas-fiscais
   */
  async listarNFs(req, res) {
    try {
      const { data_inicio, data_fim, cliente_id } = req.query;

      const filtros = {
        data_inicio,
        data_fim,
        cliente_id,
      };

      const nfs = await nfService.listarNFs(filtros);

      res.json(nfs);
    } catch (error) {
      logger.error(`Erro ao listar NFs:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cancela uma NF
   * PUT /api/notas-fiscais/:id/cancelar
   */
  async cancelarNF(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      if (!motivo) {
        return res.status(400).json({
          error: "Motivo do cancelamento é obrigatório",
        });
      }

      const result = await nfService.cancelarNF(id, motivo);

      res.json(result);
    } catch (error) {
      logger.error(`Erro ao cancelar NF:`, error);
      res.status(400).json({ error: error.message });
    }
  }
}

export default new NFController();
