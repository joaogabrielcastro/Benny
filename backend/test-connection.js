import pool from "./database.js";

async function testConnection() {
  try {
    console.log("Testando conexão com o banco...");
    const result = await pool.query(
      "SELECT NOW() as now, version() as version"
    );
    console.log("✅ Conexão OK!");
    console.log("Hora do servidor:", result.rows[0].now);
    console.log("Versão PostgreSQL:", result.rows[0].version);

    // Testar se tabelas existem
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log("\n📊 Tabelas no banco:");
    tables.rows.forEach((row) => console.log(`  - ${row.table_name}`));

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro na conexão:", error.message);
    process.exit(1);
  }
}

testConnection();
