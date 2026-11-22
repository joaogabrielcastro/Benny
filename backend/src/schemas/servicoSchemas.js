import { z } from "zod";

export const createServicoSchema = z.object({
  codigo: z.string().optional().nullable(),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional().nullable(),
  valor_unitario: z.coerce.number().min(0).optional(),
  categoria: z.string().trim().max(80).nullable().optional(),
  tempo_estimado_min: z.preprocess(
    (v) => (v === "" ? null : v),
    z.coerce.number().int().min(0).max(100000).nullable().optional(),
  ),
});

export const updateServicoSchema = createServicoSchema.partial();
