import pool from "../../database.js";

const listar = async (filtros) => {
  const { data_inicio, data_fim, status, cliente_id } = filtros;

  let query = `
    SELECT a.*, 
           c.nome as cliente_nome, c.telefone as cliente_telefone,
           v.modelo as veiculo_modelo, v.placa as veiculo_placa
    FROM agendamentos a
    LEFT JOIN clientes c ON a.cliente_id = c.id
    LEFT JOIN veiculos v ON a.veiculo_id = v.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (data_inicio) {
    query += ` AND a.data_agendamento >= $${paramIndex}`;
    params.push(data_inicio);
    paramIndex++;
  }

  if (data_fim) {
    query += ` AND a.data_agendamento <= $${paramIndex}`;
    params.push(data_fim);
    paramIndex++;
  }

  if (status) {
    query += ` AND a.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (cliente_id) {
    query += ` AND a.cliente_id = $${paramIndex}`;
    params.push(cliente_id);
    paramIndex++;
  }

  query += ` ORDER BY a.data_agendamento DESC, a.hora_inicio ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const buscarPorId = async (id) => {
  const result = await pool.query(
    `SELECT a.*, 
            c.nome as cliente_nome, c.telefone as cliente_telefone,
            v.modelo as veiculo_modelo, v.placa as veiculo_placa
     FROM agendamentos a
     LEFT JOIN clientes c ON a.cliente_id = c.id
     LEFT JOIN veiculos v ON a.veiculo_id = v.id
     WHERE a.id = $1`,
    [id]
  );

  return result.rows[0];
};

const criar = async (dados) => {
  const {
    cliente_id,
    veiculo_id,
    data_agendamento,
    hora_inicio,
    hora_fim,
    tipo_servico,
    observacoes,
    valor_estimado,
    mecanico_responsavel,
  } = dados;

  const conflito = await pool.query(
    `SELECT id FROM agendamentos 
     WHERE data_agendamento = $1 
     AND status NOT IN ('Cancelado', 'Concluído')
     AND (
       (hora_inicio <= $2 AND hora_fim >= $2) OR
       (hora_inicio <= $3 AND hora_fim >= $3) OR
       (hora_inicio >= $2 AND hora_fim <= $3)
     )`,
    [data_agendamento, hora_inicio, hora_fim || hora_inicio]
  );

  if (conflito.rows.length > 0) {
    const err = new Error("Já existe um agendamento neste horário");
    err.code = "CONFLITO_AGENDAMENTO";
    throw err;
  }

  const result = await pool.query(
    `INSERT INTO agendamentos 
     (cliente_id, veiculo_id, data_agendamento, hora_inicio, hora_fim, 
      tipo_servico, observacoes, valor_estimado, mecanico_responsavel)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [
      cliente_id,
      veiculo_id || null,
      data_agendamento,
      hora_inicio,
      hora_fim || null,
      tipo_servico,
      observacoes || null,
      valor_estimado || null,
      mecanico_responsavel || null,
    ]
  );

  return result.rows[0];
};

const atualizar = async (id, dados) => {
  const {
    status,
    data_agendamento,
    hora_inicio,
    hora_fim,
    tipo_servico,
    observacoes,
    valor_estimado,
    mecanico_responsavel,
  } = dados;

  const result = await pool.query(
    `UPDATE agendamentos 
     SET status = COALESCE($1, status),
         data_agendamento = COALESCE($2, data_agendamento),
         hora_inicio = COALESCE($3, hora_inicio),
         hora_fim = COALESCE($4, hora_fim),
         tipo_servico = COALESCE($5, tipo_servico),
         observacoes = COALESCE($6, observacoes),
         valor_estimado = COALESCE($7, valor_estimado),
         mecanico_responsavel = COALESCE($8, mecanico_responsavel),
         atualizado_em = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING *`,
    [
      status,
      data_agendamento,
      hora_inicio,
      hora_fim,
      tipo_servico,
      observacoes,
      valor_estimado,
      mecanico_responsavel,
      id,
    ]
  );

  return result.rows[0];
};

const deletar = async (id) => {
  await pool.query("DELETE FROM agendamentos WHERE id = $1", [id]);
  await pool.query(
    "DELETE FROM lembretes WHERE tipo = 'agendamento' AND referencia_id = $1",
    [id]
  );
  return true;
};

const hojeLista = async () => {
  const hoje = new Date().toISOString().split("T")[0];

  const result = await pool.query(
    `SELECT a.*, 
            c.nome as cliente_nome, c.telefone as cliente_telefone,
            v.modelo as veiculo_modelo, v.placa as veiculo_placa
     FROM agendamentos a
     LEFT JOIN clientes c ON a.cliente_id = c.id
     LEFT JOIN veiculos v ON a.veiculo_id = v.id
     WHERE a.data_agendamento = $1
     ORDER BY a.hora_inicio ASC`,
    [hoje]
  );

  return result.rows;
};

export default {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
  hojeLista,
};
