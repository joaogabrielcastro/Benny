import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const osIdParamSchema = z.object({
  osId: z.coerce.number().int().positive(),
});
