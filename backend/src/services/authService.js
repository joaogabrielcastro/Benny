import pool from "../../database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "benny-change-this-in-production";
const JWT_EXPIRY = "8h";

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

// Registra nova oficina (tenant) + usuário admin
const registrar = async ({
  tenantNome,
  tenantSlug,
  tenantEmail,
  nome,
  email,
  senha,
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verificar slug único
    const slugExiste = await client.query(
      "SELECT id FROM tenants WHERE slug = $1",
      [tenantSlug],
    );
    if (slugExiste.rows.length > 0) {
      throw Object.assign(new Error("Identificador de oficina já em uso"), {
        code: "SLUG_TAKEN",
      });
    }

    // Verificar e-mail único no tenant
    const emailExiste = await client.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email],
    );
    if (emailExiste.rows.length > 0) {
      throw Object.assign(new Error("E-mail já cadastrado"), {
        code: "EMAIL_TAKEN",
      });
    }

    const tenantResult = await client.query(
      `INSERT INTO tenants (slug, nome, email, status, plano)
       VALUES ($1, $2, $3, 'active', 'basic') RETURNING *`,
      [tenantSlug, tenantNome, tenantEmail],
    );
    const tenant = tenantResult.rows[0];

    const senhaHash = await bcrypt.hash(senha, 10);

    const userResult = await client.query(
      `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, role)
       VALUES ($1, $2, $3, $4, 'admin') RETURNING id, nome, email, role`,
      [tenant.id, nome, email, senhaHash],
    );
    const user = userResult.rows[0];

    await client.query("COMMIT");

    const token = gerarToken(user, tenant.id);

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        tenantId: tenant.id,
      },
      tenant: { id: tenant.id, nome: tenant.nome, slug: tenant.slug },
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
    `SELECT u.id, u.nome, u.email, u.senha_hash, u.role, u.ativo,
            u.tenant_id, t.nome as tenant_nome, t.slug as tenant_slug, t.status as tenant_status
     FROM usuarios u
     JOIN tenants t ON u.tenant_id = t.id
     WHERE u.email = $1`,
    [email],
  );

  const user = result.rows[0];

  // Mensagem genérica para não revelar se e-mail existe
  if (!user || !user.ativo) throw new Error("Credenciais inválidas");
  if (user.tenant_status !== "active")
    throw new Error("Conta suspensa. Entre em contato com o suporte.");

  const senhaValida = await bcrypt.compare(senha, user.senha_hash);
  if (!senhaValida) throw new Error("Credenciais inválidas");

  await pool.query(
    "UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1",
    [user.id],
  );

  const token = gerarToken(user, user.tenant_id);

  return {
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      tenantNome: user.tenant_nome,
      tenantSlug: user.tenant_slug,
    },
  };
};

export default { registrar, login };
