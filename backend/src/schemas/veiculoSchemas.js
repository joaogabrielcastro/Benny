import { z } from "zod";

export const createVeiculoSchema = z.object({
  cliente_id: z.coerce.number().int().positive(),
  modelo: z.string().min(1, "Modelo é obrigatório"),
  marca: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  placa: z.string().min(1, "Placa é obrigatória"),
  ano: z.coerce.number().int().optional().nullable(),
});
