import pool from "../database.js";
import crypto from "crypto";

async function generateTokens() {
  try {
    console.log("🔧 Gerando tokens públicos para orçamentos...");

    // Buscar orçamentos sem token
    const result = await pool.query(
      "SELECT id FROM orcamentos WHERE token_publico IS NULL"
    );

    if (result.rows.length === 0) {
      console.log("✓ Todos os orçamentos já possuem tokens!");
      return;
    }

    console.log(`📝 Encontrados ${result.rows.length} orçamentos sem token`);

    // Gerar token para cada orçamento
    for (const row of result.rows) {
      let token;
      let existe = true;

      // Garantir que o token seja único
      while (existe) {
        token = crypto.randomBytes(32).toString("hex");
        const check = await pool.query(
          "SELECT id FROM orcamentos WHERE token_publico = $1",
          [token]
        );
        existe = check.rows.length > 0;
      }

      // Atualizar o orçamento com o token
      await pool.query(
        "UPDATE orcamentos SET token_publico = $1 WHERE id = $2",
        [token, row.id]
      );

      console.log(`  ✓ Token gerado para orçamento ID ${row.id}`);
    }

    console.log("✓ Tokens gerados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao gerar tokens:", error);
  } finally {
    process.exit();
  }
}

generateTokens();
