import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";

const listar = async (tenantId = SINGLE_TENANT_ID) => {
  const result = await pool.query(
    "SELECT * FROM servicos WHERE tenant_id = $1 ORDER BY nome",
    [tenantId],
  );
  return result.rows;
};

const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {
  const result = await pool.query(
    "SELECT * FROM servicos WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  return result.rows[0] || null;
};

const normalizeCodigoOpcional = (codigo) => {
  if (codigo === undefined || codigo === null) return "";
  return String(codigo).trim();
};

const criar = async (tenantId = SINGLE_TENANT_ID, { codigo, nome, descricao, valor_unitario }) => {
  const codigoInformado = normalizeCodigoOpcional(codigo);

  if (codigoInformado !== "") {
    const result = await pool.query(
      `INSERT INTO servicos (codigo, nome, descricao, valor_unitario, tenant_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [codigoInformado, nome, descricao, valor_unitario || 0, tenantId],
    );
    return result.rows[0];
  }

  const sqlAuto = `
    WITH next_num AS (
      SELECT COALESCE(MAX((regexp_match(codigo, '^S-([0-9]+)$'))[1]::int), 0) + 1 AS n
      FROM servicos WHERE tenant_id = $4 AND codigo ~ '^S-[0-9]+$'
    )
    INSERT INTO servicos (codigo, nome, descricao, valor_unitario, tenant_id)
    SELECT (
      'S-' || lpad(next_num.n::text, GREATEST(4, length(next_num.n::text)), '0')
    ), $1, $2, $3, $4
    FROM next_num
    RETURNING *`;

  const params = [nome, descricao, valor_unitario || 0, tenantId];

  let lastErr;
  for (let i = 0; i < 25; i++) {
    try {
      const result = await pool.query(sqlAuto, params);
      return result.rows[0];
    } catch (e) {
      if (e.code !== "23505") throw e;
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Não foi possível gerar um código de serviço único");
};

const atualizar = async (
  tenantId,
  id,
  { codigo, nome, descricao, valor_unitario },
) => {
  const result = await pool.query(
    `UPDATE servicos SET codigo=$1, nome=$2, descricao=$3, valor_unitario=$4,
     atualizado_em=CURRENT_TIMESTAMP WHERE id=$5 AND tenant_id=$6 RETURNING *`,
    [codigo, nome, descricao, valor_unitario || 0, id, tenantId],
  );
  return result.rows[0] || null;
};

const deletar = async (tenantId = SINGLE_TENANT_ID, id) => {
  await pool.query("DELETE FROM servicos WHERE id = $1 AND tenant_id = $2", [
    id,
    tenantId,
  ]);
};

export default { listar, buscarPorId, criar, atualizar, deletar };
