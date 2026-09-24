import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";

function textoCadastro(valor, max) {
  if (valor == null) return null;
  const limpo = String(valor).replace(/\s+/g, " ").trim();
  if (!limpo) return null;
  return limpo.slice(0, max);
}

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
  { cliente_id, modelo, marca, cor, placa, ano, chassi, versao, motor, combustivel },
  db = pool,
) => {
  const chassiNorm = chassi
    ? String(chassi).trim().toUpperCase().slice(0, 20)
    : null;
  const result = await db.query(
    `INSERT INTO veiculos (
       cliente_id, modelo, marca, cor, placa, ano, chassi,
       versao, motor, combustivel, tenant_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      cliente_id,
      modelo,
      marca || null,
      cor,
      placa,
      ano,
      chassiNorm,
      textoCadastro(versao, 80),
      textoCadastro(motor, 80),
      combustivel || null,
      tenantId,
    ],
  );
  return result.rows[0];
};

const atualizar = async (tenantId = SINGLE_TENANT_ID, id, dados, db = pool) => {
  const atual = await db.query(
    "SELECT * FROM veiculos WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  if (!atual.rows[0]) return null;
  const prev = atual.rows[0];
  const chassi =
    dados.chassi !== undefined
      ? dados.chassi
        ? String(dados.chassi).trim().toUpperCase().slice(0, 20)
        : null
      : prev.chassi;
  const result = await db.query(
    `UPDATE veiculos
     SET modelo = $1, marca = $2, cor = $3, placa = $4, ano = $5, chassi = $6,
         versao = $7, motor = $8, combustivel = $9
     WHERE id = $10 AND tenant_id = $11
     RETURNING *`,
    [
      dados.modelo !== undefined ? dados.modelo : prev.modelo,
      dados.marca !== undefined ? dados.marca || null : prev.marca,
      dados.cor !== undefined ? dados.cor : prev.cor,
      dados.placa !== undefined ? dados.placa : prev.placa,
      dados.ano !== undefined ? dados.ano : prev.ano,
      chassi,
      dados.versao !== undefined ? textoCadastro(dados.versao, 80) : prev.versao,
      dados.motor !== undefined ? textoCadastro(dados.motor, 80) : prev.motor,
      dados.combustivel !== undefined ? dados.combustivel || null : prev.combustivel,
      id,
      tenantId,
    ],
  );
  return result.rows[0] || null;
};

export default { listar, listarPorCliente, criar, atualizar };
