import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";

const listar = async (tenantId = SINGLE_TENANT_ID, filtros) => {
  const { tipo, enviado } = filtros;

  let query = "SELECT * FROM lembretes WHERE tenant_id = $1";
  const params = [tenantId];
  let paramIndex = 2;

  if (tipo) {
    query += ` AND tipo = $${paramIndex}`;
    params.push(tipo);
    paramIndex++;
  }

  if (enviado !== undefined) {
    query += ` AND enviado = $${paramIndex}`;
    params.push(enviado === "true");
    paramIndex++;
  }

  let countQuery = "SELECT COUNT(*)::int AS total FROM lembretes WHERE tenant_id = $1";
  const countParams = [tenantId];
  let ci = 2;
  if (tipo) {
    countQuery += ` AND tipo = $${ci++}`;
    countParams.push(tipo);
  }
  if (enviado !== undefined) {
    countQuery += ` AND enviado = $${ci++}`;
    countParams.push(enviado === "true");
  }
  const countRes = await pool.query(countQuery, countParams);
  const total = countRes.rows[0]?.total ?? 0;

  const limit = filtros.limit ?? 20;
  const offset = filtros.offset ?? 0;
  query += ` ORDER BY data_lembrete DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return { rows: result.rows, total };
};

const hoje = async (tenantId = SINGLE_TENANT_ID) => {
  const hojeDate = new Date();
  hojeDate.setHours(0, 0, 0, 0);
  const amanha = new Date(hojeDate);
  amanha.setDate(amanha.getDate() + 1);

  const result = await pool.query(
    `SELECT l.*, 
            CASE 
              WHEN l.tipo = 'agendamento' THEN a.tipo_servico
              WHEN l.tipo = 'conta_pagar' THEN c.descricao
            END as descricao_referencia
     FROM lembretes l
     LEFT JOIN agendamentos a ON l.tipo = 'agendamento' AND l.referencia_id = a.id
     LEFT JOIN contas_pagar c ON l.tipo = 'conta_pagar' AND l.referencia_id = c.id
     WHERE l.tenant_id = $1 AND l.data_lembrete >= $2 AND l.data_lembrete < $3 AND l.enviado = false
     ORDER BY l.prioridade DESC, l.data_lembrete ASC`,
    [tenantId, hojeDate, amanha],
  );

  return result.rows;
};

const marcarEnviado = async (tenantId = SINGLE_TENANT_ID, id) => {
  const result = await pool.query(
    `UPDATE lembretes 
     SET enviado = true, data_envio = CURRENT_TIMESTAMP 
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, tenantId],
  );

  return result.rows[0];
};

const criar = async (tenantId = SINGLE_TENANT_ID, dados) => {
  const { tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade } =
    dados;
  const result = await pool.query(
    `INSERT INTO lembretes (tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      tipo,
      referencia_id,
      titulo,
      mensagem,
      data_lembrete,
      prioridade || "media",
      tenantId,
    ],
  );

  return result.rows[0];
};

export default { listar, hoje, marcarEnviado, criar };
