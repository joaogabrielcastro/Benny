import pool from "../../database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "benny-change-this-in-production";
const JWT_EXPIRY = "8h";
const DEFAULT_TENANT_ID = Number(process.env.DEFAULT_TENANT_ID || 1);

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
  const result = await pool.query(
    `SELECT id, nome, email, senha_hash, role, ativo, tenant_id
     FROM usuarios
     WHERE email = $1`,
    [email],
  );

  const user = result.rows[0];

  // Mensagem genérica para não revelar se e-mail existe
  if (!user || !user.ativo) throw new Error("Credenciais inválidas");

  const senhaValida = await bcrypt.compare(senha, user.senha_hash);
  if (!senhaValida) throw new Error("Credenciais inválidas");

  await pool.query(
    "UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1",
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
