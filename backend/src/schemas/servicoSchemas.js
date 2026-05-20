import { z } from "zod";

export const createServicoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional().nullable(),
  valor_unitario: z.coerce.number().min(0).optional(),
});

export const updateServicoSchema = createServicoSchema.partial();
