import { z } from "zod";

export const createContaPagarSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  valor: z.coerce.number().positive("Valor deve ser maior que zero"),
  data_vencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  fornecedor: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  recorrente: z.coerce.boolean().optional(),
  frequencia: z
    .enum(["diario", "semanal", "mensal", "anual"])
    .optional()
    .nullable(),
  intervalo: z.coerce.number().int().positive().optional().nullable(),
  data_termino: z.string().optional().nullable(),
});

export const updateContaPagarSchema = createContaPagarSchema.partial().extend({
  data_pagamento: z.string().optional().nullable(),
  status: z.enum(["Pendente", "Pago", "Vencida"]).optional(),
  forma_pagamento: z.string().optional().nullable(),
});
