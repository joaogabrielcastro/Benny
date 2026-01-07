import logger from "../config/logger.js";

// Middleware de tratamento de erros
export const errorHandler = (err, req, res, next) => {
  logger.error("Erro na requisição:", {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Violação de unicidade (registro duplicado)
  if (err.code === "23505") {
    return res.status(409).json({ error: "Registro duplicado" });
  }

  // Violação de chave estrangeira
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referência inválida" });
  }

  // Violação de not null
  if (err.code === "23502") {
    return res.status(400).json({ error: "Campo obrigatório não preenchido" });
  }

  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Erro interno do servidor"
        : err.message,
  });
};

// Handler para rotas não encontradas (404)
export const notFoundHandler = (req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Endpoint não encontrado" });
};
