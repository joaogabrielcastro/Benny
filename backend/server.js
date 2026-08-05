import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import compression from "compression";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import pool from "./database.js";
import apiRoutes from "./src/routes/index.js";
import { initScheduler } from "./src/jobs/scheduler.js";
import {
  errorHandler,
  notFoundHandler,
} from "./src/middleware/errorHandler.js";
import { requireAuth } from "./src/middleware/authMiddleware.js";
import billingController from "./src/controllers/billingController.js";
import { asyncHandler } from "./src/lib/asyncHandler.js";
import "./src/config/jwt.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3011;

// ─── Middlewares ──────────────────────────────────────────────────────────────

app.use(helmet());
app.use(compression());

const allowedOrigins = [
  "https://benny.jwsoftware.com.br",
  "https://api-benny.jwsoftware.com.br",
];

const allowedOriginPatterns = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /\.vercel\.app$/,
];

const corsOrigin = (origin, callback) => {
  // Permite chamadas sem Origin (curl, health checks internos)
  if (!origin) return callback(null, true);

  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  const matchesPattern = allowedOriginPatterns.some((pattern) =>
    pattern.test(origin),
  );

  if (matchesPattern) {
    return callback(null, true);
  }

  return callback(new Error(`CORS bloqueado para origem: ${origin}`));
};

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Stripe webhook exige raw body (antes do JSON parser)
app.post(
  "/api/billing/webhook",
  bodyParser.raw({ type: "application/json" }),
  asyncHandler((req, res) => billingController.webhook(req, res)),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Storage local — protegido por autenticação (Bearer ou cookie)
const storageCandidates = [
  process.env.STORAGE_DIR,
  path.join(process.cwd(), "storage"),
  path.join(process.cwd(), "backend", "storage"),
].filter(Boolean);
const storageDir =
  storageCandidates.find((dir) => fs.existsSync(dir)) ||
  storageCandidates[0] ||
  path.join(process.cwd(), "storage");
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}
app.use(
  "/api/storage",
  requireAuth,
  express.static(storageDir, { fallthrough: false }),
);

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ─── Rotas ───────────────────────────────────────────────────────────────────

app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Inicialização ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[INFO] Servidor rodando em http://localhost:${PORT}`);
  initScheduler(pool);
});
