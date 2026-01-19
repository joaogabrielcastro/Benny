import pool from "../config/database.js";
import cryptoLib from "../lib/crypto.js";

class GatewayConfigsService {
  async criar(config) {
    let certificadoBuffer = null;
    if (config.certificado_a1) {
      // encrypt the base64 string and store binary
      const encrypted = cryptoLib.encryptBase64String(config.certificado_a1);
      certificadoBuffer = encrypted;
    }

    const result = await pool.query(
      `INSERT INTO gateway_configs (empresa_id, provider, api_key, api_secret, certificado_a1, certificado_senha, ativo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        config.empresa_id,
        config.provider,
        config.api_key || null,
        config.api_secret || null,
        certificadoBuffer,
        config.certificado_senha || null,
        config.ativo === false ? false : true,
      ],
    );
    const row = result.rows[0];
    return row;
  }

  async listar() {
    const res = await pool.query(
      "SELECT id, empresa_id, provider, ativo, criado_em FROM gateway_configs ORDER BY id DESC",
    );
    return res.rows;
  }

  async buscarPorId(id) {
    const res = await pool.query(
      "SELECT * FROM gateway_configs WHERE id = $1",
      [id],
    );
    return res.rows[0];
  }

  async registrarAuditoria(id, usuario) {
    try {
      await pool.query(
        `INSERT INTO auditoria (tabela, registro_id, acao, usuario, dados_novos) VALUES ($1,$2,$3,$4,$5)`,
        ["gateway_configs", id, "download_certificado", usuario, null],
      );
    } catch (e) {
      console.error("Erro registrando auditoria:", e.message);
    }
  }

  async deletar(id) {
    await pool.query("DELETE FROM gateway_configs WHERE id = $1", [id]);
    return { message: "deleted" };
  }
}

export default new GatewayConfigsService();
