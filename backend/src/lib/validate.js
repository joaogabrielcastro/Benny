import { ZodError } from "zod";
import { AppError } from "./AppError.js";

/**
 * Middleware de validação Zod.
 * @param {import('zod').ZodSchema} schema
 * @param {"body"|"query"|"params"} source
 */
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const err = parsed.error;
      const details =
        err instanceof ZodError
          ? err.flatten()
          : { formErrors: [err.message || "Dados inválidos"] };
      return next(new AppError(400, "Dados inválidos", details));
    }
    req.validated = req.validated || {};
    req.validated[source] = parsed.data;
    next();
  };
