import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, "../../backups");

const realizar = async (tenantId = SINGLE_TENANT_ID) => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(
    BACKUP_DIR,
    `backup-${tenantId}-${timestamp}.json`,
  );

  const [produtos, clientes, veiculos, orcamentos, ordens] = await Promise.all([
    pool.query("SELECT * FROM produtos WHERE tenant_id = $1", [tenantId]),
    pool.query("SELECT * FROM clientes WHERE tenant_id = $1", [tenantId]),
    pool.query("SELECT * FROM veiculos WHERE tenant_id = $1", [tenantId]),
    pool.query("SELECT * FROM orcamentos WHERE tenant_id = $1", [tenantId]),
    pool.query("SELECT * FROM ordens_servico WHERE tenant_id = $1", [tenantId]),
  ]);

  const backupData = {
    timestamp: new Date().toISOString(),
    tenantId,
    tables: {
      produtos: produtos.rows,
      clientes: clientes.rows,
      veiculos: veiculos.rows,
      orcamentos: orcamentos.rows,
      ordens_servico: ordens.rows,
    },
  };

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

  return {
    file: backupFile,
    size: fs.statSync(backupFile).size,
  };
};

const listar = async () => {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
    .map((f) => {
      const filePath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(filePath);
      return { name: f, size: stat.size, created: stat.birthtime };
    })
    .sort((a, b) => new Date(b.created) - new Date(a.created));
};

export default { realizar, listar };
