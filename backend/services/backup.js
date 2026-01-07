import pool from "../database.js";
import logger from "../config/logger.js";

// Função para realizar backup automático
export async function realizarBackupAutomatico() {
  try {
    logger.info("🔄 Iniciando backup automático...");

    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const backupDir = path.join(__dirname, "../backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `backup-auto-${timestamp}.json`);

    const [produtos, clientes, veiculos, orcamentos, ordens] =
      await Promise.all([
        pool.query("SELECT * FROM produtos"),
        pool.query("SELECT * FROM clientes"),
        pool.query("SELECT * FROM veiculos"),
        pool.query("SELECT * FROM orcamentos"),
        pool.query("SELECT * FROM ordens_servico"),
      ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      database: "benny_motorsport",
      tipo: "automatico",
      tables: {
        produtos: produtos.rows,
        clientes: clientes.rows,
        veiculos: veiculos.rows,
        orcamentos: orcamentos.rows,
        ordens_servico: ordens.rows,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    // Limpar backups antigos (manter apenas últimos 10)
    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
      .map((file) => ({
        name: file,
        path: path.join(backupDir, file),
        created: fs.statSync(path.join(backupDir, file)).birthtime,
      }))
      .sort((a, b) => b.created - a.created);

    if (files.length > 10) {
      files.slice(10).forEach((file) => {
        fs.unlinkSync(file.path);
        logger.info(`🗑️  Backup antigo removido: ${file.name}`);
      });
    }

    logger.info(`✓ Backup automático realizado com sucesso: ${backupFile}`);
  } catch (error) {
    logger.error("❌ Erro ao realizar backup automático:", error);
  }
}

export async function criarBackup() {
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const backupDir = path.join(__dirname, "../backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

  // Exportar todas as tabelas principais
  const [produtos, clientes, veiculos, orcamentos, ordens] = await Promise.all([
    pool.query("SELECT * FROM produtos"),
    pool.query("SELECT * FROM clientes"),
    pool.query("SELECT * FROM veiculos"),
    pool.query("SELECT * FROM orcamentos"),
    pool.query("SELECT * FROM ordens_servico"),
  ]);

  const backupData = {
    timestamp: new Date().toISOString(),
    database: "benny_motorsport",
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
    success: true,
    message: "Backup realizado com sucesso",
    file: backupFile,
    size: fs.statSync(backupFile).size,
  };
}

export async function listarBackups() {
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const backupDir = path.join(__dirname, "../backups");

  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs
    .readdirSync(backupDir)
    .filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
    .map((file) => {
      const stats = fs.statSync(path.join(backupDir, file));
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime,
      };
    })
    .sort((a, b) => b.created - a.created);

  return files;
}
