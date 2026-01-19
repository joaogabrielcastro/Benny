import pool from "../src/config/database.js";

async function run() {
  const client = await pool.connect();
  try {
    console.log("Applying schema fixes for nf_jobs...");
    await client.query("BEGIN");

    await client.query(
      `ALTER TABLE nf_jobs ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP;`,
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS nf_jobs_dlq (
        id SERIAL PRIMARY KEY,
        original_job_id INTEGER,
        nota_fiscal_id INTEGER,
        payload JSONB,
        attempts INTEGER,
        last_error TEXT,
        moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query("COMMIT");
    console.log("Schema fixes applied successfully");
    process.exit(0);
  } catch (err) {
    console.error("Error applying schema fixes:", err);
    try {
      await client.query("ROLLBACK");
    } catch (e) {}
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
