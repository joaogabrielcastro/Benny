import { z } from "zod";

export const createProdutoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  codigo: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  quantidade: z.coerce.number().min(0).optional(),
  valor_venda: z.coerce.number().min(0).optional(),
  valor_custo: z.coerce.number().min(0).optional(),
  estoque_minimo: z.coerce.number().min(0).optional(),
  ncm: z.string().optional().nullable(),
});

export const updateProdutoSchema = createProdutoSchema.partial();
