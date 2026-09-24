import { z } from "zod";
import { parseInteiroBR, parseNumeroBR } from "../lib/parseNumero.js";

function preprocessNumeroBR(v) {
  if (v == null || v === "") return v;
  const n = parseNumeroBR(v);
  return n == null ? v : n;
}

function preprocessInteiroBR(v) {
  if (v == null || v === "") return null;
  const n = parseInteiroBR(v);
  return n == null ? v : n;
}

const numeroBR = z.preprocess(
  preprocessNumeroBR,
  z.number({ invalid_type_error: "Valor numérico inválido" }),
);

const inteiroBR = z.preprocess(
  preprocessInteiroBR,
  z.number({ invalid_type_error: "Valor numérico inválido" }).int(),
);

const kmSchema = z.preprocess(
  (v) => (v == null || v === "" ? null : preprocessInteiroBR(v)),
  z
    .number()
    .int("Km deve ser um número inteiro")
    .nonnegative("Km não pode ser negativo")
    .nullable()
    .optional(),
);

const linhaProdutoSchema = z.object({
  id: z.preprocess(
    (v) => (v == null || v === "" ? null : preprocessInteiroBR(v)),
    z.number().int().positive().nullable().optional(),
  ),
  produto_id: z.preprocess(
    (v) => (v == null || v === "" ? null : preprocessInteiroBR(v)),
    z.number().int().positive().optional().nullable(),
  ),
  codigo: z.string().optional().nullable(),
  descricao: z.string().min(1, "Descrição do produto é obrigatória"),
  ncm: z.preprocess(
    (v) => {
      if (v == null || String(v).trim() === "") return null;
      return String(v).replace(/\D/g, "");
    },
    z
      .string()
      .regex(/^\d{8}$/, "NCM deve ter 8 dígitos")
      .nullable()
      .optional(),
  ),
  quantidade: inteiroBR.pipe(
    z.number().int().positive("Quantidade do produto deve ser inteira e maior que zero"),
  ),
  valor_unitario: numeroBR.pipe(z.number().min(0, "Valor unitário inválido")),
  valor_total: numeroBR.pipe(z.number().min(0, "Valor total inválido")),
});

const linhaServicoSchema = z.object({
  codigo: z.string().optional().nullable(),
  descricao: z.string().min(1, "Descrição do serviço é obrigatória"),
  quantidade: numeroBR.pipe(
    z.number().positive("Quantidade do serviço deve ser maior que zero"),
  ),
  valor_unitario: numeroBR.pipe(z.number().min(0, "Valor unitário inválido")),
  valor_total: numeroBR.pipe(z.number().min(0, "Valor total inválido")),
});

const comercialBaseSchema = z.object({
  cliente_id: z.coerce
    .number()
    .int()
    .positive("Cliente é obrigatório"),
  veiculo_id: z.coerce
    .number()
    .int()
    .positive("Veículo é obrigatório"),
  km: kmSchema,
  previsao_entrega: z.string().optional().nullable(),
  observacoes_veiculo: z.string().optional().nullable(),
  observacoes_gerais: z.string().optional().nullable(),
  responsavel_tecnico: z.string().optional().nullable(),
  produtos: z.array(linhaProdutoSchema).default([]),
  servicos: z.array(linhaServicoSchema).default([]),
});

export const createOrcamentoSchema = comercialBaseSchema;

/** Atualização: status + itens; cliente/veículo opcionais (detalhes só altera status). */
export const updateOrcamentoSchema = z.object({
  status: z.enum(["Pendente", "Aprovado", "Reprovado"]),
  cliente_id: z.coerce.number().int().positive().optional(),
  veiculo_id: z.coerce.number().int().positive().optional(),
  km: kmSchema,
  previsao_entrega: z.string().optional().nullable(),
  observacoes_veiculo: z.string().optional().nullable(),
  observacoes_gerais: z.string().optional().nullable(),
  responsavel_tecnico: z.string().optional().nullable(),
  produtos: z.array(linhaProdutoSchema).default([]),
  servicos: z.array(linhaServicoSchema).default([]),
});

export const createOrdemServicoSchema = comercialBaseSchema.extend({
  consumidor_final: z.boolean().nullable().optional(),
});

export const updateOrdemServicoSchema = z.object({
  status: z
    .enum(["Aberta", "Em andamento", "Finalizada", "Cancelada"])
    .optional(),
  responsavel_tecnico: z.string().optional().nullable(),
  km: kmSchema,
  previsao_entrega: z.string().optional().nullable(),
  observacoes_veiculo: z.string().optional().nullable(),
  observacoes_gerais: z.string().optional().nullable(),
  consumidor_final: z.boolean().nullable().optional(),
  /** Enviados pelo formulário; ignorados pelo service até suportar edição de itens */
  produtos: z.array(linhaProdutoSchema).optional(),
  servicos: z.array(linhaServicoSchema).optional(),
});

export const orcamentoTokenParamSchema = z.object({
  token: z.string().min(32).max(128),
});
