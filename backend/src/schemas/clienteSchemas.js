import { z } from "zod";

const optionalStr = z.string().optional().nullable();

export const createClienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  telefone: optionalStr,
  cpf_cnpj: optionalStr,
  email: optionalStr,
  endereco: optionalStr,
  cep: optionalStr,
  numero: optionalStr,
  complemento: optionalStr,
  bairro: optionalStr,
  cidade: optionalStr,
  estado: optionalStr,
});

export const updateClienteSchema = createClienteSchema.partial().extend({
  nome: z.string().min(1).optional(),
});

export const listClientesQuerySchema = z.object({
  busca: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});
