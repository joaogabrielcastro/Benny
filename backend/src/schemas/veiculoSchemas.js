import { z } from "zod";

export const COMBUSTIVEIS = [
  "Gasolina",
  "Etanol",
  "Flex",
  "Diesel",
  "Elétrico",
  "Híbrido",
  "GNV",
  "Outro",
];

function textoLivre(max) {
  return z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => {
      if (v == null) return null;
      const limpo = String(v).replace(/\s+/g, " ").trim();
      return limpo ? limpo.slice(0, max) : null;
    });
}

const combustivelSchema = z.preprocess(
  (v) => (v == null || v === "" ? null : v),
  z.enum(COMBUSTIVEIS).nullable().optional(),
);

export const createVeiculoSchema = z.object({
  cliente_id: z.coerce.number().int().positive(),
  modelo: z.string().min(1, "Modelo é obrigatório"),
  marca: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  placa: z.string().min(1, "Placa é obrigatória"),
  ano: z.coerce.number().int().optional().nullable(),
  chassi: z.string().max(20).optional().nullable(),
  versao: textoLivre(80),
  motor: textoLivre(80),
  combustivel: combustivelSchema,
});

export const updateVeiculoSchema = createVeiculoSchema
  .partial()
  .omit({ cliente_id: true });
