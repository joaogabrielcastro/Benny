import pool from "../src/config/database.js";

(async function () {
  try {
    const res = await pool.query(
      "SELECT id, nota_fiscal_id, status, attempts, last_error, criado_em, atualizado_em FROM nf_jobs ORDER BY criado_em DESC LIMIT 20",
    );
    console.log("nf_jobs:");
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
