import pool from "../../database.js";

class AuditoriaController {
  async buscarPorOS(req, res) {
    const result = await pool.query(
      `SELECT * FROM auditoria
       WHERE tabela = 'ordens_servico' AND registro_id = $1
       ORDER BY criado_em DESC`,
      [req.params.id],
    );
    res.json(result.rows);
  }

  async buscarPorOrcamento(req, res) {
    const result = await pool.query(
      `SELECT * FROM auditoria
       WHERE tabela = 'orcamentos' AND registro_id = $1
       ORDER BY criado_em DESC`,
      [req.params.id],
    );
    res.json(result.rows);
  }
}

export default new AuditoriaController();
