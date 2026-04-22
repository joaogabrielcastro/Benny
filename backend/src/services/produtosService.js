import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";

const listar = async (tenantId = SINGLE_TENANT_ID, { limit = 20, offset = 0 }) => {
  const [result, countResult] = await Promise.all([
    pool.query(
      "SELECT * FROM produtos WHERE tenant_id = $1 ORDER BY nome LIMIT $2 OFFSET $3",
      [tenantId, limit, offset],
    ),
    pool.query("SELECT COUNT(*) FROM produtos WHERE tenant_id = $1", [
      tenantId,
    ]),
  ]);
  return { rows: result.rows, total: parseInt(countResult.rows[0].count) };
};

const estoqueBaixo = async (tenantId = SINGLE_TENANT_ID) => {
  const result = await pool.query(
    "SELECT * FROM produtos WHERE tenant_id = $1 AND quantidade <= estoque_minimo ORDER BY quantidade",
    [tenantId],
  );
  return result.rows;
};

const diagnostico = async (tenantId = SINGLE_TENANT_ID) => {
  const result = await pool.query(
    `SELECT id, codigo, nome,
            CASE WHEN descricao IS NULL THEN 'NULL' ELSE 'OK' END as descricao_status,
            quantidade, valor_custo, valor_venda, estoque_minimo
     FROM produtos WHERE tenant_id = $1 ORDER BY id`,
    [tenantId],
  );
  const problemProducts = result.rows.filter(
    (p) =>
      p.quantidade === null ||
      p.valor_venda === null ||
      p.codigo === null ||
      p.nome === null,
  );
  return {
    total: result.rows.length,
    problemProducts,
    allProducts: result.rows,
  };
};

const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {
  const result = await pool.query(
    `SELECT id,
            COALESCE(codigo, '') as codigo,
            COALESCE(nome, '') as nome,
            COALESCE(descricao, '') as descricao,
            COALESCE(quantidade, 0)::numeric as quantidade,
            COALESCE(valor_custo, 0)::numeric as valor_custo,
            COALESCE(valor_venda, 0)::numeric as valor_venda,
            COALESCE(estoque_minimo, 0)::numeric as estoque_minimo,
            criado_em, atualizado_em
     FROM produtos WHERE id = $1::integer AND tenant_id = $2`,
    [id, tenantId],
  );
  return result.rows[0] || null;
};

const criar = async (
  tenantId,
  {
    codigo,
    nome,
    descricao,
    quantidade,
    valor_custo,
    valor_venda,
    estoque_minimo,
  },
) => {
  let result;
  if (codigo && codigo.toString().trim() !== "") {
    result = await pool.query(
      `INSERT INTO produtos (codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        codigo,
        nome,
        descricao,
        quantidade || 0,
        valor_custo || 0,
        valor_venda || 0,
        estoque_minimo || 5,
        tenantId,
      ],
    );
  } else {
    result = await pool.query(
      `WITH next_num AS (
         SELECT COALESCE(MAX((regexp_replace(codigo, '\\D', '', 'g'))::int), 0) + 1 AS n FROM produtos WHERE tenant_id = $7
       )
       INSERT INTO produtos (codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo, tenant_id)
       SELECT ('P-' || lpad(next_num.n::text, 4, '0')), $1, $2, $3, $4, $5, $6, $7
       FROM next_num
       RETURNING *`,
      [
        nome,
        descricao,
        quantidade || 0,
        valor_custo || 0,
        valor_venda || 0,
        estoque_minimo || 5,
        tenantId,
      ],
    );
  }
  return result.rows[0];
};

const atualizar = async (
  tenantId,
  id,
  {
    codigo,
    nome,
    descricao,
    quantidade,
    valor_custo,
    valor_venda,
    estoque_minimo,
  },
) => {
  const result = await pool.query(
    `UPDATE produtos
     SET codigo = $1, nome = $2, descricao = $3, quantidade = $4, valor_custo = $5,
         valor_venda = $6, estoque_minimo = $7, atualizado_em = CURRENT_TIMESTAMP
     WHERE id = $8 AND tenant_id = $9 RETURNING *`,
    [
      codigo,
      nome,
      descricao,
      quantidade,
      valor_custo,
      valor_venda,
      estoque_minimo,
      id,
      tenantId,
    ],
  );
  return result.rows[0] || null;
};

const deletar = async (tenantId = SINGLE_TENANT_ID, id) => {
  await pool.query("DELETE FROM produtos WHERE id = $1 AND tenant_id = $2", [
    id,
    tenantId,
  ]);
};

export default {
  listar,
  estoqueBaixo,
  diagnostico,
  buscarPorId,
  criar,
  atualizar,
  deletar,
};
