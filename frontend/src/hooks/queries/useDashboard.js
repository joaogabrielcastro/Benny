import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { queryKeys } from "../../api/queryKeys";

export function useDashboardData() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const [relatorioRes, agendHojeRes, contasRes] = await Promise.all([
        api.get("/relatorios/dashboard"),
        api.get("/agendamentos/hoje/lista"),
        api.get("/contas-pagar/alertas/resumo"),
      ]);

      return {
        relatorio: relatorioRes.data,
        agendamentosHoje: agendHojeRes.data,
        alertasContas: contasRes.data,
      };
    },
  });
}
