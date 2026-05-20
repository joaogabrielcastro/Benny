import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { unwrapListResponse } from "../../utils/apiList";
import { queryKeys } from "../../api/queryKeys";

export function useOrdensServicoList(params = { limit: 500 }) {
  return useQuery({
    queryKey: queryKeys.ordensServico(params),
    queryFn: async () => {
      const { data } = await api.get("/ordens-servico", { params });
      return unwrapListResponse(data);
    },
  });
}

export function useClientesList(params = { limit: 500 }) {
  return useQuery({
    queryKey: queryKeys.clientes(params),
    queryFn: async () => {
      const { data } = await api.get("/clientes", { params });
      return unwrapListResponse(data);
    },
  });
}
