import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: DATABASE_URL ausente");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
try {
  const r = await pool.query("SELECT current_database() AS db, now() AS agora");
  console.log("OK", r.rows[0]);
  const t = await pool.query("SELECT id, slug FROM tenants ORDER BY id LIMIT 5");
  console.log("tenants", t.rows);
} catch (e) {
  console.error("FAIL", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
