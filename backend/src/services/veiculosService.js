import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";

const listar = async (
  tenantId = SINGLE_TENANT_ID,
  { limit = 20, offset = 0 } = {},
) => {
  const countResult = await pool.query(
    "SELECT COUNT(*)::int AS total FROM veiculos WHERE tenant_id = $1",
    [tenantId],
  );
  const total = countResult.rows[0]?.total ?? 0;
  const result = await pool.query(
    `SELECT v.*, c.nome as cliente_nome
     FROM veiculos v
     LEFT JOIN clientes c ON v.cliente_id = c.id
     WHERE v.tenant_id = $1
     ORDER BY v.modelo
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return { rows: result.rows, total };
};

const listarPorCliente = async (tenantId = SINGLE_TENANT_ID, clienteId) => {
  const result = await pool.query(
    "SELECT * FROM veiculos WHERE cliente_id = $1 AND tenant_id = $2",
    [clienteId, tenantId],
  );
  return result.rows;
};

const criar = async (
  tenantId = SINGLE_TENANT_ID,
  { cliente_id, modelo, marca, cor, placa, ano, chassi },
) => {
  const chassiNorm = chassi
    ? String(chassi).trim().toUpperCase().slice(0, 20)
    : null;
  const result = await pool.query(
    `INSERT INTO veiculos (cliente_id, modelo, marca, cor, placa, ano, chassi, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [cliente_id, modelo, marca || null, cor, placa, ano, chassiNorm, tenantId],
  );
  return result.rows[0];
};

export default { listar, listarPorCliente, criar };
