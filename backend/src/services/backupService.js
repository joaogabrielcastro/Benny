import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import { uploadFileToS3 } from "../lib/s3Upload.js";
import pool from "../../database.js";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, "../../backups");
const KEEP_LAST = 10;

/** Tabelas de negócio incluídas no fallback JSON (dump lógico completo). */
const JSON_BACKUP_TABLES = [
  "tenants",
  "usuarios",
  "clientes",
  "veiculos",
  "produtos",
  "servicos",
  "orcamentos",
  "orcamento_produtos",
  "orcamento_servicos",
  "ordens_servico",
  "os_produtos",
  "os_servicos",
  "movimentacoes_estoque",
  "agendamentos",
  "contas_pagar",
  "lembretes",
  "notas_fiscais",
  "auditoria",
];

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function pruneOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-"))
    .map((f) => {
      const filePath = path.join(BACKUP_DIR, f);
      return {
        name: f,
        path: filePath,
        created: fs.statSync(filePath).mtime,
      };
    })
    .sort((a, b) => b.created - a.created);

  if (files.length > KEEP_LAST) {
    files.slice(KEEP_LAST).forEach((f) => {
      try {
        fs.unlinkSync(f.path);
      } catch {
        /* ignore */
      }
    });
  }
}

/**
 * Backup físico via pg_dump (formato custom, restaurável com pg_restore).
 * Requer cliente PostgreSQL no PATH (imagem Docker instala postgresql-client).
 */
async function dumpWithPgDump(backupFile) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada");
  }

  await execFileAsync(
    "pg_dump",
    [
      `--dbname=${databaseUrl}`,
      "--no-owner",
      "--no-acl",
      "--format=custom",
      `--file=${backupFile}`,
    ],
    {
      env: process.env,
      maxBuffer: 200 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    },
  );
}

/** Fallback: exporta todas as tabelas de negócio em JSON. */
async function dumpAsJson(backupFile, tenantId) {
  const tables = {};

  for (const table of JSON_BACKUP_TABLES) {
    try {
      const hasTenant = await pool.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
           AND column_name = 'tenant_id'
         LIMIT 1`,
        [table],
      );

      const result =
        hasTenant.rowCount > 0 && table !== "tenants"
          ? await pool.query(`SELECT * FROM ${table} WHERE tenant_id = $1`, [
              tenantId,
            ])
          : await pool.query(`SELECT * FROM ${table}`);

      tables[table] = result.rows;
    } catch (err) {
      if (err.code === "42P01") {
        tables[table] = [];
        continue;
      }
      throw err;
    }
  }

  const payload = {
    timestamp: new Date().toISOString(),
    tenantId,
    tipo: "json-fallback",
    aviso:
      "Fallback lógico. Preferir arquivo .dump (pg_dump) para restore completo.",
    tables,
  };

  fs.writeFileSync(backupFile, JSON.stringify(payload, null, 2));
}

/**
 * Realiza backup: tenta pg_dump; se indisponível, gera JSON completo.
 * Upload S3 opcional (BACKUP_S3_BUCKET) — falha de upload não aborta o backup local.
 */
const realizar = async (tenantId = SINGLE_TENANT_ID, options = {}) => {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const preferJson = options.preferJson === true;

  let file;
  let formato;
  let metodo;

  if (!preferJson) {
    const dumpFile = path.join(
      BACKUP_DIR,
      `backup-${tenantId}-${timestamp}.dump`,
    );
    try {
      await dumpWithPgDump(dumpFile);
      file = dumpFile;
      formato = "pg_dump";
      metodo = "pg_dump";
    } catch (err) {
      console.warn(
        `[WARN] pg_dump indisponível (${err.message}). Usando fallback JSON completo.`,
      );
    }
  }

  if (!file) {
    const jsonFile = path.join(
      BACKUP_DIR,
      `backup-${tenantId}-${timestamp}.json`,
    );
    await dumpAsJson(jsonFile, tenantId);
    file = jsonFile;
    formato = "json";
    metodo = "json-fallback";
  }

  pruneOldBackups();

  let remoto = { uploaded: false };
  try {
    remoto = await uploadFileToS3(file, path.basename(file));
    if (remoto.uploaded) {
      console.log(`[INFO] Backup enviado ao S3: ${remoto.key}`);
    }
  } catch (err) {
    console.error(`[ERROR] Upload remoto do backup falhou: ${err.message}`);
    remoto = { uploaded: false, error: err.message };
  }

  return {
    file,
    size: fs.statSync(file).size,
    formato,
    metodo,
    remoto,
  };
};

const listar = async () => {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs
    .readdirSync(BACKUP_DIR)
    .filter(
      (f) =>
        f.startsWith("backup-") &&
        (f.endsWith(".json") || f.endsWith(".dump") || f.endsWith(".sql")),
    )
    .map((f) => {
      const filePath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(filePath);
      const formato = f.endsWith(".dump")
        ? "pg_dump"
        : f.endsWith(".sql")
          ? "sql"
          : "json";
      return {
        name: f,
        size: stat.size,
        created: stat.mtime,
        formato,
      };
    })
    .sort((a, b) => new Date(b.created) - new Date(a.created));
};

export default { realizar, listar, JSON_BACKUP_TABLES };
