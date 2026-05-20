import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { unwrapListResponse } from "../../utils/apiList";
import { queryKeys } from "../../api/queryKeys";

export function useDashboardData() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const [osRes, orcRes, estRes, relatorioRes] = await Promise.all([
        api.get("/ordens-servico", { params: { limit: 500 } }),
        api.get("/orcamentos", { params: { limit: 500 } }),
        api.get("/produtos/alertas/estoque-baixo"),
        api.get("/relatorios/dashboard"),
      ]);

      const osLista = unwrapListResponse(osRes.data);
      const orcLista = unwrapListResponse(orcRes.data);
      const estoqueBaixo = Array.isArray(estRes.data)
        ? estRes.data
        : unwrapListResponse(estRes.data);

      return {
        osLista,
        orcLista,
        estoqueBaixo,
        relatorio: relatorioRes.data,
      };
    },
  });
}
