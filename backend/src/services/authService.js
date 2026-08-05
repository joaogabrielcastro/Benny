import pool from "../../database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt.js";
import {
  SINGLE_TENANT_ID,
  SINGLE_TENANT_MODE,
} from "../config/singleTenant.js";
import { normalizeRole } from "../config/roles.js";

function roleOrThrow(role) {
  const normalized = normalizeRole(role);
  if (!normalized) {
    throw new Error("Credenciais inválidas");
  }
  return normalized;
}

const findUserByEmail = async (email) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, email, senha_hash, role, ativo, tenant_id
       FROM usuarios
       WHERE email = $1`,
      [email],
    );

    if (result.rows[0]) {
      return { user: result.rows[0], tableName: "usuarios" };
    }
  } catch (error) {
    if (error.code !== "42P01") throw error;
  }

  return { user: null, tableName: null };
};

const gerarToken = (user, tenantId) =>
  jwt.sign(
    {
      userId: user.id,
      tenantId,
      email: user.email,
      nome: user.nome,
      role: roleOrThrow(user.role),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

const login = async ({ email, senha }) => {
  const { user, tableName } = await findUserByEmail(email);

  if (!user || !user.ativo) {
    throw new Error("Credenciais inválidas");
  }

  const senhaValida = await bcrypt.compare(senha, user.senha_hash);
  if (!senhaValida) {
    throw new Error("Credenciais inválidas");
  }

  await pool.query(
    `UPDATE ${tableName} SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1`,
    [user.id],
  );

  const role = roleOrThrow(user.role);
  const tenantId = SINGLE_TENANT_MODE
    ? SINGLE_TENANT_ID
    : Number(user.tenant_id) || SINGLE_TENANT_ID;
  const token = gerarToken(user, tenantId);

  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role,
      tenantId,
    },
  };
};

export default { login };
