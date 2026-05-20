import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { unwrapListResponse } from "../../utils/apiList";
import { queryKeys } from "../../api/queryKeys";

export function useProdutosList(params = { limit: 500 }) {
  return useQuery({
    queryKey: queryKeys.produtos(params),
    queryFn: async () => {
      const { data } = await api.get("/produtos", { params });
      return unwrapListResponse(data);
    },
  });
}

export function useEstoqueBaixo() {
  return useQuery({
    queryKey: queryKeys.estoqueBaixo,
    queryFn: async () => {
      const { data } = await api.get("/produtos/alertas/estoque-baixo");
      return Array.isArray(data) ? data : unwrapListResponse(data);
    },
  });
}
