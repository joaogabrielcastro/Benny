import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";

const listar = async (
  tenantId = SINGLE_TENANT_ID,
  { busca, limit = 20, offset = 0 } = {},
) => {
  const params = [tenantId];
  let where = "WHERE tenant_id = $1";

  if (busca) {
    params.push(`%${busca}%`);
    where +=
      " AND (LOWER(nome) LIKE LOWER($2) OR LOWER(telefone) LIKE LOWER($2) OR LOWER(cpf_cnpj) LIKE LOWER($2))";
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM clientes ${where}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const dataResult = await pool.query(
    `SELECT * FROM clientes ${where} ORDER BY nome LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, limit, offset],
  );

  return { rows: dataResult.rows, total };
};

const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {
  const result = await pool.query(
    "SELECT * FROM clientes WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  return result.rows[0] || null;
};

const criar = async (
  tenantId,
  {
    nome,
    telefone,
    cpf_cnpj,
    email,
    endereco,
    cep,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
  },
) => {
  const result = await pool.query(
    `INSERT INTO clientes (nome, telefone, cpf_cnpj, email, endereco, cep, numero, complemento, bairro, cidade, estado, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    [
      nome,
      telefone,
      cpf_cnpj,
      email,
      endereco,
      cep,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      tenantId,
    ],
  );
  return result.rows[0];
};

const atualizar = async (
  tenantId,
  id,
  {
    nome,
    telefone,
    cpf_cnpj,
    email,
    endereco,
    cep,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
  },
) => {
  await pool.query(
    `UPDATE clientes
     SET nome=$1, telefone=$2, cpf_cnpj=$3, email=$4, endereco=$5,
         cep=$6, numero=$7, complemento=$8, bairro=$9, cidade=$10, estado=$11,
         atualizado_em=CURRENT_TIMESTAMP
     WHERE id=$12 AND tenant_id=$13`,
    [
      nome,
      telefone,
      cpf_cnpj,
      email,
      endereco,
      cep,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      id,
      tenantId,
    ],
  );
};

export default { listar, buscarPorId, criar, atualizar };
