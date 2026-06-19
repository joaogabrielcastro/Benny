/**
 * Erro de aplicação com status HTTP explícito.
 */
export class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFound = (message = "Registro não encontrado") =>
  new AppError(404, message);

export const badRequest = (message, details = null) =>
  new AppError(400, message, details);

export const unauthorized = (message = "Não autorizado") =>
  new AppError(401, message);

export const forbidden = (message = "Acesso negado") =>
  new AppError(403, message);
