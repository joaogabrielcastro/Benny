#!/usr/bin/env node
/**
 * Cria usuário admin padrão se ainda não existir (idempotente).
 * Credenciais via DOCKER_ADMIN_EMAIL / DOCKER_ADMIN_PASSWORD.
 */
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pkg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { Pool } = pkg;
const databaseUrl = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (!databaseUrl) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

const email = (process.env.DOCKER_ADMIN_EMAIL || "admin@oficina.com").trim();
const senha = process.env.DOCKER_ADMIN_PASSWORD || "123456";
const nome = process.env.DOCKER_ADMIN_NOME || "Administrador";
const tenantId = parseInt(process.env.DEFAULT_TENANT_ID || "1", 10) || 1;

async function run() {
  const exists = await pool.query("SELECT id FROM usuarios WHERE email = $1", [email]);
  if (exists.rows.length) {
    console.log(`⊘ Admin já existe: ${email}`);
    return;
  }

  await pool.query(
    `INSERT INTO tenants (id, slug, nome, email, status, plano)
     VALUES ($1, 'default', 'Tenant Padrão', $2, 'active', 'basic')
     ON CONFLICT (id) DO NOTHING`,
    [tenantId, email],
  );

  const hash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, role, tenant_id, ativo)
     VALUES ($1, $2, $3, 'admin', $4, true)`,
    [nome, email, hash, tenantId],
  );

  console.log(`✓ Admin criado: ${email} / senha: ${senha}`);
}

run()
  .catch((err) => {
    console.error("Falha no seed-admin:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
