/**
 * Script para executar a migration de multi-tenant
 * 
 * Uso: node run-multi-tenant-migration.js
 */

import dotenv from "dotenv";
import pkg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🚀 Iniciando migração Multi-Tenant...\n");

    // Ler arquivo SQL
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "001_add_multi_tenant.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Executar migration
    await client.query(migrationSQL);

    console.log("✅ Migration executada com sucesso!\n");

    // Verificar tenants criados
    const tenantsResult = await client.query("SELECT * FROM tenants");
    console.log(`📊 Tenants encontrados: ${tenantsResult.rows.length}`);

    if (tenantsResult.rows.length > 0) {
      console.log("\nTenants:");
      tenantsResult.rows.forEach((tenant) => {
        console.log(
          `  - ${tenant.nome} (${tenant.slug}) - Status: ${tenant.status}`,
        );
      });
    }

    console.log("\n✨ Migração concluída!");
    console.log("\n📝 Próximos passos:");
    console.log("1. Execute: npm run dev");
    console.log("2. Teste criando um tenant via API:");
    console.log('   POST http://localhost:3000/api/tenants');
    console.log("   Body: { slug, nome, email, ... }");
    console.log("3. Use o header X-Tenant-ID ou X-Tenant-Slug nas requisições");
    console.log(
      '\n4. Atualize os services existentes seguindo o padrão do arquivo "empresasService.EXAMPLE.js"\n',
    );
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    console.error("\nDetalhes:", error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
