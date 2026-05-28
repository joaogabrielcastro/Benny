import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { unwrapListResponse, unwrapPagination } from "../../utils/apiList";
import { queryKeys } from "../../api/queryKeys";

export function useOrcamentosPaginated(params = {}) {
  return useQuery({
    queryKey: queryKeys.orcamentos(params),
    queryFn: async () => {
      const { data } = await api.get("/orcamentos", { params });
      return {
        rows: unwrapListResponse(data),
        pagination: unwrapPagination(data),
      };
    },
    placeholderData: (prev) => prev,
  });
}
