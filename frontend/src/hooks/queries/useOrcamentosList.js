import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { unwrapListResponse } from "../../utils/apiList";
import { queryKeys } from "../../api/queryKeys";

export function useOrcamentosList(params = {}) {
  return useQuery({
    queryKey: queryKeys.orcamentos(params),
    queryFn: async () => {
      const { data } = await api.get("/orcamentos", {
        params: { limit: 500, ...params },
      });
      return unwrapListResponse(data);
    },
  });
}
