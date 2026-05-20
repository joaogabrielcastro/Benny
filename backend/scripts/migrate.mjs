#!/usr/bin/env node
/**
 * Executa migrations SQL em backend/migrations/ em ordem numérica.
 * Registra versões aplicadas em schema_migrations.
 *
 * Uso: npm run migrate
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "migrations");

const databaseUrl = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (!databaseUrl) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("sslmode=disable")
    ? false
    : { rejectUnauthorized: false },
});

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function appliedVersions(client) {
  const { rows } = await client.query(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  return new Set(rows.map((r) => r.version));
}

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function run() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const done = await appliedVersions(client);
    const files = listMigrationFiles();

    if (files.length === 0) {
      console.log("Nenhuma migration encontrada.");
      return;
    }

    let applied = 0;
    for (const file of files) {
      if (done.has(file)) {
        console.log(`⊘ ${file} (já aplicada)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`→ ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [file],
        );
        await client.query("COMMIT");
        applied++;
        console.log(`✓ ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log(
      applied > 0
        ? `\n${applied} migration(s) aplicada(s).`
        : "\nBanco já está atualizado.",
    );
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Falha nas migrations:", err.message);
  process.exit(1);
});
