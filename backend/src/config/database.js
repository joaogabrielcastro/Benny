import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool, types } = pkg;

// Configurar pg para retornar valores numéricos como números (não strings)
types.setTypeParser(1700, function (val) {
  return parseFloat(val);
});

// Configurar pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Testar conexão
pool.on("connect", () => {
  console.log("✓ Conectado ao banco de dados PostgreSQL (Neon)");
});

export default pool;
