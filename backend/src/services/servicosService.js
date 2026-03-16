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

const criar = async (tenantId = SINGLE_TENANT_ID, { codigo, nome, descricao, valor_unitario }) => {
  let result;
  if (codigo && codigo.toString().trim() !== "") {
    result = await pool.query(
      `INSERT INTO servicos (codigo, nome, descricao, valor_unitario, tenant_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [codigo, nome, descricao, valor_unitario || 0, tenantId],
    );
  } else {
    result = await pool.query(
      `WITH next_num AS (
         SELECT COALESCE(MAX((regexp_replace(codigo, '\\D', '', 'g'))::int), 0) + 1 AS n FROM servicos WHERE tenant_id = $4
       )
       INSERT INTO servicos (codigo, nome, descricao, valor_unitario, tenant_id)
       SELECT ('S-' || lpad(next_num.n::text, 4, '0')), $1, $2, $3, $4
       FROM next_num
       RETURNING *`,
      [nome, descricao, valor_unitario || 0, tenantId],
    );
  }
  return result.rows[0];
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
