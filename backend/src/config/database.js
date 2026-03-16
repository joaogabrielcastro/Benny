import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool, types } = pkg;
const rawDatabaseUrl = process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl.trim().replace(/^['"]|['"]$/g, "");

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não definida. Configure a variável de ambiente com a connection string do PostgreSQL.",
  );
}

try {
  new URL(databaseUrl);
} catch {
  throw new Error(
    "DATABASE_URL inválida. Verifique formato da URL e codifique caracteres especiais da senha (ex.: @, #, %, /).",
  );
}

// Configurar pg para retornar valores numéricos como números (não strings)
types.setTypeParser(1700, function (val) {
  return parseFloat(val);
});

// Configurar pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("sslmode=disable")
    ? false
    : { rejectUnauthorized: false },
});

// Testar conexão
pool.on("connect", () => {
  console.log("✓ Conectado ao banco de dados PostgreSQL (Neon)");
});

export default pool;
