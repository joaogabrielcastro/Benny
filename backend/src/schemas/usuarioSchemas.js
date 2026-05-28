import { z } from "zod";

const roleSchema = z.enum(["admin", "mecanico"]);

export const createUsuarioSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: roleSchema.default("mecanico"),
});

export const updateUsuarioSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: roleSchema.optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(6).optional(),
});
