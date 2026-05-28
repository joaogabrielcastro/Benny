import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { unwrapListResponse, unwrapPagination } from "../../utils/apiList";
import { queryKeys } from "../../api/queryKeys";

export function useProdutosPaginated(params = {}) {
  return useQuery({
    queryKey: queryKeys.produtos(params),
    queryFn: async () => {
      const { data } = await api.get("/produtos", { params });
      return {
        rows: unwrapListResponse(data),
        pagination: unwrapPagination(data),
      };
    },
    placeholderData: (prev) => prev,
  });
}
