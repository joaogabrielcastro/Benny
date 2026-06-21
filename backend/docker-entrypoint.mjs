#!/usr/bin/env node
/**
 * Entrypoint Docker: aguarda Postgres, bootstrap/migrate, inicia o servidor.
 */
import { spawn, spawnSync } from "child_process";
import pkg from "pg";

const { Pool } = pkg;

const databaseUrl = (process.env.DATABASE_URL || "")
  .trim()
  .replace(/^['"]|['"]$/g, "");

async function waitForPostgres(maxAttempts = 60) {
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

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await pool.query("SELECT 1");
      await pool.end();
      console.log("✓ PostgreSQL disponível");
      return;
    } catch {
      if (i === maxAttempts) {
        await pool.end();
        throw new Error("PostgreSQL não respondeu a tempo.");
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

function runNode(script) {
  const r = spawnSync("node", [script], { stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function bootstrap() {
  if (process.env.DOCKER_BOOTSTRAP_DB === "true") {
    runNode("scripts/bootstrap-docker.mjs");
    return;
  }
  console.log("→ Migrations…");
  runNode("scripts/migrate.mjs");
  runNode("scripts/seed-admin.mjs");
}

function startServer() {
  const cmd = process.argv.slice(2);
  const [bin, ...args] = cmd.length ? cmd : ["node", "server.js"];
  const child = spawn(bin, args, { stdio: "inherit", env: process.env });
  child.on("exit", (code) => process.exit(code ?? 0));
}

await waitForPostgres();
await bootstrap();
startServer();
