import { z } from "zod";

export const fechamentoMensalQuerySchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});
