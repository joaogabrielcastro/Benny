import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { unwrapListResponse, unwrapPagination } from "../../utils/apiList";
import { queryKeys } from "../../api/queryKeys";

export function useServicosPaginated(params = {}) {
  return useQuery({
    queryKey: queryKeys.servicos(params),
    queryFn: async () => {
      const { data } = await api.get("/servicos", { params });
      return {
        rows: unwrapListResponse(data),
        pagination: unwrapPagination(data),
      };
    },
    placeholderData: (prev) => prev,
  });
}
