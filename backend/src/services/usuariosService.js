import bcrypt from "bcrypt";
import pool from "../../database.js";
import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import { normalizeRole, ROLES } from "../config/roles.js";

const SALT_ROUNDS = 10;

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    role: normalizeRole(row.role),
    ativo: row.ativo,
    ultimo_login: row.ultimo_login,
    criado_em: row.criado_em,
  };
}

const listar = async (tenantId = SINGLE_TENANT_ID) => {
  const r = await pool.query(
    `SELECT id, nome, email, role, ativo, ultimo_login, criado_em
     FROM usuarios WHERE tenant_id = $1
     ORDER BY nome`,
    [tenantId],
  );
  return r.rows.map(sanitizeUser);
};

const buscarPorId = async (tenantId, id) => {
  const r = await pool.query(
    `SELECT id, nome, email, role, ativo, ultimo_login, criado_em
     FROM usuarios WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  return sanitizeUser(r.rows[0]);
};

const criar = async (
  tenantId,
  { nome, email, senha, role = ROLES.MECANICO },
) => {
  const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);
  const r = await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, role, tenant_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nome, email, role, ativo, ultimo_login, criado_em`,
    [nome, email.toLowerCase().trim(), senha_hash, normalizeRole(role), tenantId],
  );
  return sanitizeUser(r.rows[0]);
};

const atualizar = async (
  tenantId,
  id,
  { nome, email, role, ativo, senha },
  { actorUserId } = {},
) => {
  const atual = await pool.query(
    `SELECT id, role, ativo FROM usuarios WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  if (!atual.rows[0]) return null;

  if (Number(actorUserId) === Number(id)) {
    if (ativo === false) {
      const err = new Error("Você não pode desativar sua própria conta");
      err.code = "SELF_DEACTIVATE";
      throw err;
    }
    if (role && normalizeRole(role) !== ROLES.ADMIN) {
      const err = new Error("Você não pode remover seu próprio perfil de administrador");
      err.code = "SELF_DEMOTE";
      throw err;
    }
  }

  const fields = [];
  const params = [];
  let i = 1;

  if (nome !== undefined) {
    fields.push(`nome = $${i++}`);
    params.push(nome);
  }
  if (email !== undefined) {
    fields.push(`email = $${i++}`);
    params.push(email.toLowerCase().trim());
  }
  if (role !== undefined) {
    fields.push(`role = $${i++}`);
    params.push(normalizeRole(role));
  }
  if (ativo !== undefined) {
    fields.push(`ativo = $${i++}`);
    params.push(ativo);
  }
  if (senha) {
    const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);
    fields.push(`senha_hash = $${i++}`);
    params.push(senha_hash);
  }

  if (fields.length === 0) return buscarPorId(tenantId, id);

  params.push(id, tenantId);
  const r = await pool.query(
    `UPDATE usuarios SET ${fields.join(", ")}
     WHERE id = $${i++} AND tenant_id = $${i}
     RETURNING id, nome, email, role, ativo, ultimo_login, criado_em`,
    params,
  );
  return sanitizeUser(r.rows[0]);
};

export default {
  listar,
  buscarPorId,
  criar,
  atualizar,
};
