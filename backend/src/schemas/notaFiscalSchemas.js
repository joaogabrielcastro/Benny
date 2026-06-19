import { z } from "zod";

export const cancelarNotaFiscalSchema = z.object({
  motivo: z.string().min(15).max(255).optional(),
  codigo: z.string().max(20).optional(),
});
