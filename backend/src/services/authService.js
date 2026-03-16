import pool from "../../database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "benny-change-this-in-production";
const JWT_EXPIRY = "8h";
const DEFAULT_TENANT_SLUG = process.env.TENANT_SLUG || "oficina";
const DEFAULT_TENANT_NOME = process.env.TENANT_NOME || "Oficina";
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

const obterOuCriarTenantPadrao = async (client, emailFallback) => {
  const existente = await client.query(
    "SELECT id FROM tenants WHERE slug = $1",
    [DEFAULT_TENANT_SLUG],
  );

  if (existente.rows.length > 0) return existente.rows[0];

  const tenantEmail = process.env.TENANT_EMAIL || emailFallback;
  const criado = await client.query(
    `INSERT INTO tenants (slug, nome, email, status, plano)
     VALUES ($1, $2, $3, 'active', 'basic') RETURNING id`,
    [DEFAULT_TENANT_SLUG, DEFAULT_TENANT_NOME, tenantEmail],
  );

  return criado.rows[0];
};

// Registro de usuário em modo single-tenant
const registrar = async ({ nome, email, senha }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verificar e-mail único
    const emailExiste = await client.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email],
    );
    if (emailExiste.rows.length > 0) {
      throw Object.assign(new Error("E-mail já cadastrado"), {
        code: "EMAIL_TAKEN",
      });
    }

    const tenant = await obterOuCriarTenantPadrao(client, email);

    const senhaHash = await bcrypt.hash(senha, 10);

    const userResult = await client.query(
      `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, role)
       VALUES ($1, $2, $3, $4, 'admin') RETURNING id, nome, email, role`,
      [tenant.id, nome, email, senhaHash],
    );
    const user = userResult.rows[0];

    await client.query("COMMIT");

    const tenantId = tenant.id || DEFAULT_TENANT_ID;
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
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

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

export default { registrar, login };
