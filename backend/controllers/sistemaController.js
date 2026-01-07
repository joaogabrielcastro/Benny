import pool from "../database.js";
import logger from "../config/logger.js";
import cache from "../config/cache.js";

export async function healthCheck(req, res) {
  try {
    await pool.query("SELECT 1");

    const memoryUsage = process.memoryUsage();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      },
      uptime: Math.round(process.uptime()),
      cache: {
        keys: cache.keys().length,
        stats: cache.getStats(),
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
}
