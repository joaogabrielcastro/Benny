import pool from "../config/database.js";

class EmpresasService {
  async criarEmpresa(data) {
    const result = await pool.query(
      `INSERT INTO empresas (nome, cnpj, inscricao_municipal, endereco, cidade, estado, telefone, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        data.nome,
        data.cnpj,
        data.inscricao_municipal || null,
        data.endereco || null,
        data.cidade || null,
        data.estado || null,
        data.telefone || null,
        data.email || null,
      ]
    );
    return result.rows[0];
  }

  async listar() {
    const result = await pool.query("SELECT * FROM empresas ORDER BY id DESC");
    return result.rows;
  }

  async buscarPorId(id) {
    const result = await pool.query("SELECT * FROM empresas WHERE id = $1", [id]);
    return result.rows[0];
  }
}

export default new EmpresasService();
