import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";

const listar = async (
  tenantId = SINGLE_TENANT_ID,
  { limit = 20, offset = 0, busca, estoque, categoria } = {},
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
    where += ` AND (nome ILIKE $${i} OR codigo ILIKE $${i})`;
    params.push(`%${busca}%`);
    i++;
  }
  if (estoque === "baixo") {
    where += " AND quantidade <= estoque_minimo";
  } else if (estoque === "zerado") {
    where += " AND quantidade = 0";
  }

  const limitIdx = i;
  const offsetIdx = i + 1;

  const [result, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM produtos ${where} ORDER BY nome LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, limit, offset],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM produtos ${where}`,
      params,
    ),
  ]);
  return { rows: result.rows, total: countResult.rows[0]?.total ?? 0 };
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
            ncm,
            criado_em, atualizado_em
     FROM produtos WHERE id = $1::integer AND tenant_id = $2`,
    [id, tenantId],
  );
  return result.rows[0] || null;
};

const normalizeCodigoOpcional = (codigo) => {
  if (codigo === undefined || codigo === null) return "";
  return String(codigo).trim();
};

const criarBase = async (
  tenantId,
  {
    codigo,
    nome,
    descricao,
    quantidade,
    valor_custo,
    valor_venda,
    estoque_minimo,
    ncm = null,
  },
) => {
  const codigoInformado = normalizeCodigoOpcional(codigo);
  const ncmGravar = ncm || null;

  if (codigoInformado !== "") {
    const result = await pool.query(
      `INSERT INTO produtos (codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo, ncm, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        codigoInformado,
        nome,
        descricao,
        quantidade || 0,
        valor_custo || 0,
        valor_venda || 0,
        estoque_minimo || 5,
        ncmGravar,
        tenantId,
      ],
    );
    return result.rows[0];
  }

  const sqlAuto = `
    WITH next_num AS (
      SELECT COALESCE(MAX((regexp_match(codigo, '^P-([0-9]+)$'))[1]::int), 0) + 1 AS n
      FROM produtos WHERE tenant_id = $8 AND codigo ~ '^P-[0-9]+$'
    )
    INSERT INTO produtos (codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo, ncm, tenant_id)
    SELECT (
      'P-' || lpad(next_num.n::text, GREATEST(4, length(next_num.n::text)), '0')
    ), $1, $2, $3, $4, $5, $6, $7, $8
    FROM next_num
    RETURNING *`;

  const params = [
    nome,
    descricao,
    quantidade || 0,
    valor_custo || 0,
    valor_venda || 0,
    estoque_minimo || 5,
    ncmGravar,
    tenantId,
  ];

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
  throw lastErr ?? new Error("Não foi possível gerar um código de produto único");
};

/** Cria o produto, grava categoria e registra o estoque inicial como movimentação. */
const criar = async (tenantId, dados) => {
  const produto = await criarBase(tenantId, dados);
  if (!produto) return produto;
  let final = produto;
  if (dados.categoria) {
    const r = await pool.query(
      "UPDATE produtos SET categoria = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *",
      [dados.categoria, produto.id, tenantId],
    );
    final = r.rows[0] || produto;
  }
  const qtd = Number(produto.quantidade || 0);
  if (qtd > 0) {
    await pool.query(
      `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, tenant_id)
       VALUES ($1, 'ENTRADA', $2, 'Estoque inicial (cadastro)', $3)`,
      [produto.id, qtd, tenantId],
    );
  }
  return final;
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
    ncm = null,
    categoria,
  },
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const prev = await client.query(
      "SELECT quantidade FROM produtos WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
      [id, tenantId],
    );
    if (!prev.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const result = await client.query(
      `UPDATE produtos
       SET codigo = $1, nome = $2, descricao = $3, quantidade = $4, valor_custo = $5,
           valor_venda = $6, estoque_minimo = $7, ncm = $8,
           categoria = CASE WHEN $11::boolean THEN $12 ELSE categoria END,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $9 AND tenant_id = $10 RETURNING *`,
      [
        codigo,
        nome,
        descricao,
        quantidade,
        valor_custo,
        valor_venda,
        estoque_minimo,
        ncm || null,
        id,
        tenantId,
        categoria !== undefined,
        categoria || null,
      ],
    );
    const antes = Number(prev.rows[0].quantidade || 0);
    const depois = Number(result.rows[0]?.quantidade ?? antes);
    if (depois !== antes) {
      await client.query(
        `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, tenant_id)
         VALUES ($1, $2, $3, 'Ajuste manual (edição do produto)', $4)`,
        [id, depois > antes ? "ENTRADA" : "SAIDA", Math.abs(depois - antes), tenantId],
      );
    }
    await client.query("COMMIT");
    return result.rows[0] || null;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

/** Entrada/saída manual de estoque com motivo, registrada em movimentações. */
const movimentar = async (tenantId, produtoId, { tipo, quantidade, motivo }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const p = await client.query(
      "SELECT id, quantidade FROM produtos WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
      [produtoId, tenantId],
    );
    if (!p.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const sinal = tipo === "ENTRADA" ? 1 : -1;
    if (sinal < 0 && Number(p.rows[0].quantidade) < quantidade) {
      const err = new Error(
        `Estoque insuficiente (disponível: ${p.rows[0].quantidade}, solicitado: ${quantidade})`,
      );
      err.status = 400;
      err.code = "ESTOQUE_INSUFICIENTE";
      throw err;
    }
    const upd = await client.query(
      `UPDATE produtos SET quantidade = quantidade + $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [sinal * quantidade, produtoId, tenantId],
    );
    await client.query(
      `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, tenant_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [produtoId, tipo, quantidade, motivo, tenantId],
    );
    await client.query("COMMIT");
    return upd.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

/** Histórico de movimentações (com produto e OS vinculada). */
const listarMovimentacoes = async (
  tenantId,
  { produto_id, tipo, limit = 20, offset = 0 } = {},
) => {
  const params = [tenantId];
  let where = "WHERE m.tenant_id = $1";
  if (produto_id) {
    params.push(produto_id);
    where += ` AND m.produto_id = $${params.length}`;
  }
  if (tipo === "ENTRADA" || tipo === "SAIDA") {
    params.push(tipo);
    where += ` AND m.tipo = $${params.length}`;
  }
  const from = `FROM movimentacoes_estoque m
    JOIN produtos p ON p.id = m.produto_id AND p.tenant_id = m.tenant_id
    LEFT JOIN ordens_servico os ON os.id = m.os_id AND os.tenant_id = m.tenant_id`;
  const [count, data] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total ${from} ${where}`, params),
    pool.query(
      `SELECT m.id, m.produto_id, m.tipo, m.quantidade, m.motivo, m.os_id, m.orcamento_id, m.criado_em,
              p.nome AS produto_nome, p.codigo AS produto_codigo, os.numero AS os_numero
       ${from} ${where}
       ORDER BY m.criado_em DESC, m.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
  ]);
  return { rows: data.rows, total: count.rows[0]?.total ?? 0 };
};

const listarCategorias = async (tenantId, tabela) => {
  const t = tabela === "servicos" ? "servicos" : "produtos";
  const r = await pool.query(
    `SELECT DISTINCT categoria FROM ${t}
     WHERE tenant_id = $1 AND categoria IS NOT NULL AND categoria <> ''
     ORDER BY categoria`,
    [tenantId],
  );
  return r.rows.map((x) => x.categoria);
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
  movimentar,
  listarMovimentacoes,
  listarCategorias,
};
