import { z } from "zod";

export const createAgendamentoSchema = z.object({
  cliente_id: z.coerce.number().int().positive("Cliente é obrigatório"),
  veiculo_id: z.coerce.number().int().positive().optional().nullable(),
  data_agendamento: z.string().min(1, "Data é obrigatória"),
  hora_inicio: z.string().min(1, "Hora de início é obrigatória"),
  hora_fim: z.string().optional().nullable(),
  tipo_servico: z.string().min(1, "Tipo de serviço é obrigatório"),
  observacoes: z.string().optional().nullable(),
  valor_estimado: z.coerce.number().min(0).optional().nullable(),
  mecanico_responsavel: z.string().optional().nullable(),
});

export const updateAgendamentoSchema = createAgendamentoSchema
  .partial()
  .extend({
    status: z
      .enum([
        "Agendado",
        "Confirmado",
        "Em Andamento",
        "Concluído",
        "Cancelado",
      ])
      .optional(),
  });
