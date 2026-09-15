import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // CHECK presente?
  const c = await pool.query(`
    SELECT conname FROM pg_constraint
    WHERE conname = 'produtos_quantidade_nao_negativa'
  `);
  console.log("check_constraint", c.rows[0]?.conname || "MISSING");

  const col = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'movimentacoes_estoque' AND column_name = 'tenant_id'
  `);
  console.log("mov_tenant_col", col.rows[0]?.column_name || "MISSING");

  // Tentar negativo
  const p = await pool.query(
    `INSERT INTO produtos (codigo, nome, quantidade, tenant_id)
     VALUES ($1,'ASE52 check',0,1) RETURNING id`,
    [`CHK-${Date.now()}`],
  );
  const id = p.rows[0].id;
  try {
    await pool.query("UPDATE produtos SET quantidade = -1 WHERE id = $1", [id]);
    console.log("negative_update", "UNEXPECTED_OK");
  } catch (e) {
    console.log("negative_update", "BLOCKED", e.code);
  }
  await pool.query("DELETE FROM produtos WHERE id = $1", [id]);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
