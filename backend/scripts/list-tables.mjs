import dotenv from "dotenv";
import pool from "../database.js";

dotenv.config();

const r = await pool.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`,
);
console.log("tables:", r.rows.map((x) => x.tablename).join(", ") || "(none)");
await pool.end();
