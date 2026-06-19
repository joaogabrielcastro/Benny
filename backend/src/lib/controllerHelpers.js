import { AppError, badRequest, notFound } from "./AppError.js";

export function parseIdParam(id, label = "ID") {
  const n = Number(id);
  if (!Number.isFinite(n) || n < 1) {
    throw badRequest(`${label} inválido`);
  }
  return n;
}

export function assertFound(row, message = "Registro não encontrado") {
  if (!row) throw notFound(message);
  return row;
}

export function isCodigoDuplicadoProduto(error) {
  return (
    error?.code === "23505" &&
    typeof error?.constraint === "string" &&
    error.constraint.includes("produtos_codigo")
  );
}

export function rethrowKnownErrors(error) {
  if (error instanceof AppError) throw error;
  if (error?.code === "CONFLITO_AGENDAMENTO") {
    throw new AppError(400, error.message);
  }
  if (isCodigoDuplicadoProduto(error)) {
    throw new AppError(
      409,
      "Já existe um produto com este código. Informe outro código ou deixe em branco para gerar automaticamente.",
    );
  }
  throw error;
}
