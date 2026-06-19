import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { unwrapListResponse, unwrapPagination } from "../../utils/apiList";
import { queryKeys } from "../../api/queryKeys";

async function fetchPaginated(url, params) {
  const { data } = await api.get(url, { params });
  return {
    rows: unwrapListResponse(data),
    pagination: unwrapPagination(data),
  };
}

export function useOrdensServicoPaginated(params = {}) {
  return useQuery({
    queryKey: queryKeys.ordensServico(params),
    queryFn: () => fetchPaginated("/ordens-servico", params),
    placeholderData: (prev) => prev,
  });
}

/** Lista de clientes para filtros avançados (dropdown). */
export function useClientesList(params = { limit: 500, page: 1 }) {
  return useQuery({
    queryKey: queryKeys.clientes(params),
    queryFn: async () => {
      const { data } = await api.get("/clientes", { params });
      return unwrapListResponse(data);
    },
  });
}
