import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import compression from "compression";
import dotenv from "dotenv";
import path from "path";
import pool from "./database.js";
import apiRoutes from "./src/routes/index.js";
import { initScheduler } from "./src/jobs/scheduler.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3011;

// ─── Middlewares ──────────────────────────────────────────────────────────────

app.use(compression());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3011",
      "https://benny.jwsoftware.com.br",
      "https://api-benny.jwsoftware.com.br",
      /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos do storage local
app.use(
  "/api/storage",
  express.static(path.join(process.cwd(), "backend", "storage")),
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

// ─── Tratamento de erros ──────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message, {
    url: req.originalUrl,
    method: req.method,
  });

  if (err.code === "23505")
    return res.status(409).json({ error: "Registro duplicado" });
  if (err.code === "23503")
    return res.status(400).json({ error: "Referência inválida" });
  if (err.code === "23502")
    return res.status(400).json({ error: "Campo obrigatório não preenchido" });

  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Erro interno do servidor"
        : err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint não encontrado" });
});

// ─── Inicialização ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[INFO] Servidor rodando em http://localhost:${PORT}`);
  initScheduler(pool);
});
