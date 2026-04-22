import pool from "../../database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "benny-change-this-in-production";
const JWT_EXPIRY = "8h";
const DEFAULT_TENANT_ID = Number(process.env.DEFAULT_TENANT_ID || 1);

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
    // 42P01 é o erro de 'tabela não existe' no Postgres
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
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );

// Login de usuário existente
const login = async ({ email, senha }) => {
  const { user, tableName } = await findUserByEmail(email);

  // Validação básica de existência e status
  if (!user || !user.ativo) {
    throw new Error("Credenciais inválidas");
  }

  // Comparação segura de hash
  const senhaValida = await bcrypt.compare(senha, user.senha_hash);
  if (!senhaValida) {
    throw new Error("Credenciais inválidas");
  }

  // Registra o timestamp do último acesso
  await pool.query(
    `UPDATE ${tableName} SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1`,
    [user.id],
  );

  const tenantId = user.tenant_id || DEFAULT_TENANT_ID;
  const token = gerarToken(user, tenantId);

  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
    },
  };
};

export default { login };
