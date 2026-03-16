// Re-exports the single shared pool from the project root.
// Eliminates the dual-pool anti-pattern: all services share one pg.Pool instance.
export { default } from "../../database.js";

