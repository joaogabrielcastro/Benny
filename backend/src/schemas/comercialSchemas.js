import { z } from "zod";

const linhaProdutoSchema = z.object({
  produto_id: z.coerce.number().int().positive().optional().nullable(),
  codigo: z.string().optional().nullable(),
  descricao: z.string().min(1, "Descrição do produto é obrigatória"),
  quantidade: z.coerce.number().positive(),
  valor_unitario: z.coerce.number().min(0),
  valor_total: z.coerce.number().min(0),
});

const linhaServicoSchema = z.object({
  codigo: z.string().optional().nullable(),
  descricao: z.string().min(1, "Descrição do serviço é obrigatória"),
  quantidade: z.coerce.number().positive(),
  valor_unitario: z.coerce.number().min(0),
  valor_total: z.coerce.number().min(0),
});

const comercialBaseSchema = z.object({
  cliente_id: z.coerce.number().int().positive("Cliente é obrigatório"),
  veiculo_id: z.coerce.number().int().positive("Veículo é obrigatório"),
  km: z.union([z.string(), z.number()]).optional().nullable(),
  previsao_entrega: z.string().optional().nullable(),
  observacoes_veiculo: z.string().optional().nullable(),
  observacoes_gerais: z.string().optional().nullable(),
  responsavel_tecnico: z.string().optional().nullable(),
  produtos: z.array(linhaProdutoSchema).default([]),
  servicos: z.array(linhaServicoSchema).default([]),
});

export const createOrcamentoSchema = comercialBaseSchema;

export const updateOrcamentoSchema = comercialBaseSchema.extend({
  status: z.enum(["Pendente", "Aprovado", "Reprovado"]),
});

export const createOrdemServicoSchema = comercialBaseSchema;

export const updateOrdemServicoSchema = z.object({
  status: z
    .enum(["Aberta", "Em andamento", "Finalizada", "Cancelada"])
    .optional(),
  responsavel_tecnico: z.string().optional().nullable(),
  km: z.union([z.string(), z.number()]).optional().nullable(),
  previsao_entrega: z.string().optional().nullable(),
  observacoes_veiculo: z.string().optional().nullable(),
  observacoes_gerais: z.string().optional().nullable(),
  /** Enviados pelo formulário; ignorados pelo service até suportar edição de itens */
  produtos: z.array(linhaProdutoSchema).optional(),
  servicos: z.array(linhaServicoSchema).optional(),
});

export const orcamentoTokenParamSchema = z.object({
  token: z.string().min(32).max(128),
});
