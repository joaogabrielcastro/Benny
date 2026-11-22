import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";

const listar = async (
  tenantId = SINGLE_TENANT_ID,
  { limit = 20, offset = 0, busca, categoria } = {},
) => {
  let where = "WHERE tenant_id = $1";
  const params = [tenantId];
  let i = 2;

  if (categoria) {
    where += ` AND categoria = $${i}`;
    params.push(categoria);
    i++;
  }

  if (busca) {
    where += ` AND (nome ILIKE $${i} OR codigo ILIKE $${i} OR COALESCE(descricao, '') ILIKE $${i})`;
    params.push(`%${busca}%`);
    i++;
  }

  const limitIdx = i;
  const offsetIdx = i + 1;

  const [result, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM servicos ${where} ORDER BY nome LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, limit, offset],
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM servicos ${where}`, params),
  ]);

  return { rows: result.rows, total: countResult.rows[0]?.total ?? 0 };
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

const criar = async (
  tenantId = SINGLE_TENANT_ID,
  { codigo, nome, descricao, valor_unitario, categoria = null, tempo_estimado_min = null },
) => {
  const codigoInformado = normalizeCodigoOpcional(codigo);

  if (codigoInformado !== "") {
    const result = await pool.query(
      `INSERT INTO servicos (codigo, nome, descricao, valor_unitario, tenant_id, categoria, tempo_estimado_min)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [codigoInformado, nome, descricao, valor_unitario || 0, tenantId, categoria || null, tempo_estimado_min ?? null],
    );
    return result.rows[0];
  }

  const sqlAuto = `
    WITH next_num AS (
      SELECT COALESCE(MAX((regexp_match(codigo, '^S-([0-9]+)$'))[1]::int), 0) + 1 AS n
      FROM servicos WHERE tenant_id = $4 AND codigo ~ '^S-[0-9]+$'
    )
    INSERT INTO servicos (codigo, nome, descricao, valor_unitario, tenant_id, categoria, tempo_estimado_min)
    SELECT (
      'S-' || lpad(next_num.n::text, GREATEST(4, length(next_num.n::text)), '0')
    ), $1, $2, $3, $4, $5, $6
    FROM next_num
    RETURNING *`;

  const params = [nome, descricao, valor_unitario || 0, tenantId, categoria || null, tempo_estimado_min ?? null];

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
  { codigo, nome, descricao, valor_unitario, categoria, tempo_estimado_min },
) => {
  // categoria/tempo: undefined preserva o valor atual (compat com clientes antigos)
  const result = await pool.query(
    `UPDATE servicos SET codigo=$1, nome=$2, descricao=$3, valor_unitario=$4,
       categoria = CASE WHEN $7::boolean THEN $8 ELSE categoria END,
       tempo_estimado_min = CASE WHEN $9::boolean THEN $10::int ELSE tempo_estimado_min END,
     atualizado_em=CURRENT_TIMESTAMP WHERE id=$5 AND tenant_id=$6 RETURNING *`,
    [
      codigo,
      nome,
      descricao,
      valor_unitario || 0,
      id,
      tenantId,
      categoria !== undefined,
      categoria || null,
      tempo_estimado_min !== undefined,
      tempo_estimado_min ?? null,
    ],
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
