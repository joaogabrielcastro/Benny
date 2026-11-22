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
  { limit = 20, offset = 0, busca } = {},
) => {
  const params = [tenantId];
  let where = "WHERE v.tenant_id = $1";
  const termo = textoCadastro(busca, 80);
  if (termo) {
    params.push(`%${termo}%`, `%${termo.replace(/[^a-z0-9]/gi, "")}%`);
    const a = `$${params.length - 1}`;
    const b = `$${params.length}`;
    where += ` AND (translate(upper(v.placa), '- ', '') ILIKE ${b}
      OR v.modelo ILIKE ${a} OR COALESCE(v.marca, '') ILIKE ${a}
      OR COALESCE(c.nome, '') ILIKE ${a} OR COALESCE(v.chassi, '') ILIKE ${a})`;
  }
  const from =
    "FROM veiculos v LEFT JOIN clientes c ON v.cliente_id = c.id AND c.tenant_id = v.tenant_id";
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total ${from} ${where}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;
  const result = await pool.query(
    `SELECT v.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
            os_stats.total_os, os_stats.ultima_os_em, os_stats.ultimo_km
     ${from}
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS total_os, MAX(os.criado_em) AS ultima_os_em, MAX(os.km) AS ultimo_km
       FROM ordens_servico os WHERE os.veiculo_id = v.id AND os.tenant_id = v.tenant_id
     ) os_stats ON TRUE
     ${where}
     ORDER BY v.modelo, v.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
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
