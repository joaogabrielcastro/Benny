import pool from "../../database.js";
import logger from "../config/logger.js";

class AuditoriaController {
  async buscarPorOS(req, res) {
    try {
      const result = await pool.query(
        `SELECT * FROM auditoria
         WHERE tabela = 'ordens_servico' AND registro_id = $1
         ORDER BY criado_em DESC`,
        [req.params.id],
      );
      res.json(result.rows);
    } catch (error) {
      logger.error(`Erro ao buscar auditoria da OS ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async buscarPorOrcamento(req, res) {
    try {
      const result = await pool.query(
        `SELECT * FROM auditoria
         WHERE tabela = 'orcamentos' AND registro_id = $1
         ORDER BY criado_em DESC`,
        [req.params.id],
      );
      res.json(result.rows);
    } catch (error) {
      logger.error(
        `Erro ao buscar auditoria do orçamento ${req.params.id}:`,
        error,
      );
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AuditoriaController();
