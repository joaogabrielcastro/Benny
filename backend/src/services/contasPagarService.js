import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";

const listar = async (tenantId = SINGLE_TENANT_ID, filtros) => {
  const { status, data_inicio, data_fim, categoria } = filtros;

  let query = "SELECT * FROM contas_pagar WHERE tenant_id = $1";
  const params = [tenantId];
  let paramIndex = 2;

  if (status) {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (data_inicio) {
    query += ` AND data_vencimento >= $${paramIndex}`;
    params.push(data_inicio);
    paramIndex++;
  }

  if (data_fim) {
    query += ` AND data_vencimento <= $${paramIndex}`;
    params.push(data_fim);
    paramIndex++;
  }

  if (categoria) {
    query += ` AND categoria = $${paramIndex}`;
    params.push(categoria);
    paramIndex++;
  }

  query += " ORDER BY data_vencimento DESC";

  const result = await pool.query(query, params);
  return result.rows;
};

const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {
  const result = await pool.query(
    "SELECT * FROM contas_pagar WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  return result.rows[0];
};

const criar = async (tenantId = SINGLE_TENANT_ID, dados) => {
  const {
    descricao,
    categoria,
    valor,
    data_vencimento,
    fornecedor,
    observacoes,
    recorrente,
    frequencia,
    intervalo,
    data_termino,
  } = dados;

  const result = await pool.query(
    `INSERT INTO contas_pagar 
     (descricao, categoria, valor, data_vencimento, fornecedor, observacoes, recorrente, frequencia, intervalo, data_termino, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, false), $8, COALESCE($9,1), $10, $11)
     RETURNING *`,
    [
      descricao,
      categoria,
      valor,
      data_vencimento,
      fornecedor || null,
      observacoes || null,
      typeof recorrente === "boolean"
        ? recorrente
        : recorrente === "true"
          ? true
          : false,
      frequencia || null,
      intervalo || 1,
      data_termino || null,
      tenantId,
    ],
  );

  return result.rows[0];
};

const atualizar = async (tenantId = SINGLE_TENANT_ID, id, dados) => {
  const {
    descricao,
    categoria,
    valor,
    data_vencimento,
    data_pagamento,
    status,
    fornecedor,
    forma_pagamento,
    observacoes,
    recorrente,
    frequencia,
    intervalo,
    data_termino,
  } = dados;

  const result = await pool.query(
    `UPDATE contas_pagar 
     SET descricao = COALESCE($1, descricao),
         categoria = COALESCE($2, categoria),
         valor = COALESCE($3, valor),
         data_vencimento = COALESCE($4, data_vencimento),
         data_pagamento = COALESCE($5, data_pagamento),
         status = COALESCE($6, status),
         fornecedor = COALESCE($7, fornecedor),
         forma_pagamento = COALESCE($8, forma_pagamento),
         observacoes = COALESCE($9, observacoes),
         recorrente = COALESCE($10, recorrente),
         frequencia = COALESCE($11, frequencia),
         intervalo = COALESCE($12, intervalo),
         data_termino = COALESCE($13, data_termino),
         atualizado_em = CURRENT_TIMESTAMP
     WHERE id = $14 AND tenant_id = $15
     RETURNING *`,
    [
      descricao,
      categoria,
      valor,
      data_vencimento,
      data_pagamento,
      status,
      fornecedor,
      forma_pagamento,
      observacoes,
      typeof recorrente === "boolean"
        ? recorrente
        : recorrente === "true"
          ? true
          : null,
      frequencia || null,
      intervalo || null,
      data_termino || null,
      id,
      tenantId,
    ],
  );

  return result.rows[0];
};

const deletar = async (tenantId = SINGLE_TENANT_ID, id) => {
  await pool.query(
    "DELETE FROM contas_pagar WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  await pool.query(
    "DELETE FROM lembretes WHERE tipo = 'conta_pagar' AND referencia_id = $1",
    [id],
  );
  return true;
};

const alertasResumo = async (tenantId = SINGLE_TENANT_ID) => {
  const hoje = new Date().toISOString().split("T")[0];

  const [vencidas, aVencer] = await Promise.all([
    pool.query(
      "SELECT * FROM contas_pagar WHERE tenant_id = $1 AND status = 'Pendente' AND data_vencimento < $2 ORDER BY data_vencimento",
      [tenantId, hoje],
    ),
    pool.query(
      "SELECT * FROM contas_pagar WHERE tenant_id = $1 AND status = 'Pendente' AND data_vencimento >= $2 AND data_vencimento <= $3 ORDER BY data_vencimento",
      [
        tenantId,
        hoje,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      ],
    ),
  ]);

  return { vencidas: vencidas.rows, aVencer: aVencer.rows };
};

export default {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
  alertasResumo,
};
