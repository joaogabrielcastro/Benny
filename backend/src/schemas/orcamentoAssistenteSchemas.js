import { z } from "zod";

const confiancaSchema = z.enum(["alta", "media", "baixa"]);
const necessidadeSchema = z.enum(["provavel", "possivel", "condicional"]);

function textoDe(valor) {
  if (typeof valor === "string") return valor;
  if (valor && typeof valor === "object") {
    return valor.texto || valor.descricao || valor.nome || valor.titulo || "";
  }
  return "";
}

function listaDe(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor == null || valor === "") return [];
  return [valor];
}

const termosBuscaSchema = z.preprocess(
  (valor) => listaDe(valor).map(textoDe).filter((t) => t.trim()).slice(0, 6),
  z.array(z.string().trim().min(1).max(80)).max(6).default([]),
);

export const sugerirAssistenteSchema = z
  .object({
    cliente_id: z.coerce.number().int().positive(),
    veiculo_id: z.coerce.number().int().positive(),
    descricao: z.string().trim().min(3, "Descreva o problema ou o serviço").max(2000),
    km: z
      .union([
        z.null(),
        z.literal(""),
        z.coerce.number().int().nonnegative().max(9_999_999),
      ])
      .optional()
      .transform((v) => (v == null || v === "" ? null : v)),
    respostas: z
      .array(
        z.object({
          pergunta: z.string().trim().min(1).max(300),
          resposta: z.string().trim().min(1).max(500),
        }),
      )
      .max(8)
      .optional()
      .default([]),
  })
  .strict();

function itemComercial(valor) {
  if (typeof valor === "string") return { descricao: valor };
  if (!valor || typeof valor !== "object") return {};
  return { ...valor, descricao: textoDe(valor.descricao || valor.nome || valor.titulo || valor.texto) };
}

const servicoSugeridoSchema = z.preprocess(
  itemComercial,
  z
    .object({
      descricao: z.string().trim().min(1).max(200),
      termos_busca: termosBuscaSchema,
      quantidade_sugerida: z.coerce.number().positive().max(999).optional().default(1),
      confianca: confiancaSchema.optional().default("media"),
    })
    .strip(),
);

const pecaSugeridaSchema = z.preprocess(
  itemComercial,
  z
    .object({
      descricao: z.string().trim().min(1).max(200),
      termos_busca: termosBuscaSchema,
      quantidade: z.coerce.number().positive().max(999).optional().default(1),
      necessidade: necessidadeSchema.optional().default("possivel"),
      confianca: confiancaSchema.optional().default("media"),
    })
    .strip(),
);

const itemCondicionalSchema = z.preprocess(
  (valor) => {
    const item = itemComercial(valor);
    if (typeof item.motivo !== "string") item.motivo = textoDe(item.motivo);
    return item;
  },
  z
    .object({
      descricao: z.string().trim().min(1).max(200),
      termos_busca: termosBuscaSchema,
      motivo: z.string().trim().max(400).optional().default(""),
    })
    .strip(),
);

/** Resposta do modelo. IDs e preços extras são descartados (.strip). */
export const respostaAssistenteIaSchema = z
  .object({
    titulo: z.preprocess(textoDe, z.string().trim().max(160).optional().default("")),
    resumo: z.preprocess(textoDe, z.string().trim().max(600).optional().default("")),
    diagnosticos_sugeridos: z.preprocess(
      (valor) => listaDe(valor).map(textoDe).filter((t) => t.trim()).slice(0, 8),
      z.array(z.string().trim().min(1).max(240)).max(8).default([]),
    ),
    servicos_sugeridos: z.preprocess(
      (valor) => listaDe(valor).slice(0, 8),
      z.array(servicoSugeridoSchema).max(8).default([]),
    ),
    pecas_sugeridas: z.preprocess(
      (valor) => listaDe(valor).slice(0, 8),
      z.array(pecaSugeridaSchema).max(8).default([]),
    ),
    itens_condicionais: z.preprocess(
      (valor) => listaDe(valor).slice(0, 6),
      z.array(itemCondicionalSchema).max(6).default([]),
    ),
    perguntas: z.preprocess(
      (valor) => listaDe(valor).map(textoDe).filter((t) => t.trim()).slice(0, 6),
      z.array(z.string().trim().min(1).max(300)).max(6).default([]),
    ),
    observacoes_historico: z.preprocess(
      (valor) => listaDe(valor).map((item) => (typeof item === "string" ? { texto: item } : item)).slice(0, 5),
      z.array(z.object({
        texto: z.preprocess(textoDe, z.string().trim().min(1).max(300)),
        relevancia: confiancaSchema.optional().default("media"),
      }).strip()).max(5).default([]),
    ),
    observacoes_casos_semelhantes: z.preprocess(
      (valor) => listaDe(valor).map((item) => (typeof item === "string" ? { texto: item } : item)).slice(0, 5),
      z.array(z.object({
        texto: z.preprocess(textoDe, z.string().trim().min(1).max(300)),
        relevancia: confiancaSchema.optional().default("media"),
      }).strip()).max(5).default([]),
    ),
  })
  .strip();
