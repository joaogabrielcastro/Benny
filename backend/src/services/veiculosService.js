import pool from "../../database.js";

const listar = async (tenantId) => {
  const result = await pool.query(
    `SELECT v.*, c.nome as cliente_nome
     FROM veiculos v
     LEFT JOIN clientes c ON v.cliente_id = c.id
     WHERE v.tenant_id = $1
     ORDER BY v.modelo`,
    [tenantId],
  );
  return result.rows;
};

const listarPorCliente = async (tenantId, clienteId) => {
  const result = await pool.query(
    "SELECT * FROM veiculos WHERE cliente_id = $1 AND tenant_id = $2",
    [clienteId, tenantId],
  );
  return result.rows;
};

const criar = async (tenantId, { cliente_id, modelo, cor, placa, ano }) => {
  const result = await pool.query(
    `INSERT INTO veiculos (cliente_id, modelo, cor, placa, ano, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [cliente_id, modelo, cor, placa, ano, tenantId],
  );
  return result.rows[0];
};

export default { listar, listarPorCliente, criar };
