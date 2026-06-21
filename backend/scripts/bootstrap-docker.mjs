#!/usr/bin/env node
/**
 * Bootstrap do banco em ambiente Docker (banco vazio).
 * 1) DDL completo (database.js)
 * 2) Migrations pendentes
 * 3) Usuário admin padrão
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

function runNode(script) {
  const r = spawnSync("node", [script], {
    cwd: backendRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

const { initDatabase } = await import("../database.js");

console.log("→ Criando/verificando schema (initDatabase)…");
await initDatabase();

console.log("→ Aplicando migrations…");
runNode("scripts/migrate.mjs");

console.log("→ Seed admin…");
runNode("scripts/seed-admin.mjs");

console.log("✓ Bootstrap concluído.");
