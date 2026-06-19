import { AppError } from "../lib/AppError.js";
import { ZodError } from "zod";
import logger from "../config/logger.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Endpoint não encontrado" });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: err.flatten(),
    });
  }

  logger.error("Erro na requisição:", {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    code: err.code,
  });

  if (err.code === "23505")
    return res.status(409).json({ error: "Registro duplicado" });
  if (err.code === "23503")
    return res.status(400).json({ error: "Referência inválida" });
  if (err.code === "23502")
    return res.status(400).json({ error: "Campo obrigatório não preenchido" });

  const isProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    error: isProd ? "Erro interno do servidor" : err.message,
  });
}
