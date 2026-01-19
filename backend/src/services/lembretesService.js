import pool from "../../database.js";

const listar = async (filtros) => {
  const { tipo, enviado } = filtros;

  let query = "SELECT * FROM lembretes WHERE 1=1";
  const params = [];
  let paramIndex = 1;

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

  query += " ORDER BY data_lembrete DESC";

  const result = await pool.query(query, params);
  return result.rows;
};

const hoje = async () => {
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
     WHERE l.data_lembrete >= $1 AND l.data_lembrete < $2 AND l.enviado = false
     ORDER BY l.prioridade DESC, l.data_lembrete ASC`,
    [hojeDate, amanha]
  );

  return result.rows;
};

const marcarEnviado = async (id) => {
  const result = await pool.query(
    `UPDATE lembretes 
     SET enviado = true, data_envio = CURRENT_TIMESTAMP 
     WHERE id = $1 
     RETURNING *`,
    [id]
  );

  return result.rows[0];
};

const criar = async (dados) => {
  const { tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade } = dados;
  const result = await pool.query(
    `INSERT INTO lembretes (tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade || 'media']
  );

  return result.rows[0];
};

export default { listar, hoje, marcarEnviado, criar };
