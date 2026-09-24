import { z } from "zod";
import { normalizarNcmInformado } from "../domain/ncm.js";

const ncmSchema = z
  .string()
  .optional()
  .nullable()
  .transform((valor, ctx) => {
    const norm = normalizarNcmInformado(valor);
    if (norm.vazio) return null;
    if (!norm.ncm) {
      ctx.addIssue({
        code: "custom",
        message: "NCM deve ter exatamente 8 dígitos",
      });
      return z.NEVER;
    }
    return norm.ncm;
  });

export const createProdutoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  codigo: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  quantidade: z.coerce.number().min(0).optional(),
  valor_venda: z.coerce.number().min(0).optional(),
  valor_custo: z.coerce.number().min(0).optional(),
  estoque_minimo: z.coerce.number().min(0).optional(),
  ncm: ncmSchema,
});

export const updateProdutoSchema = createProdutoSchema.partial();
