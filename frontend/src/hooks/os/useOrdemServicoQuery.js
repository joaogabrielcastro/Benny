import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { queryKeys } from "../../api/queryKeys";

export function useOrdemServicoQuery(osId) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.ordemServico(osId),
    enabled: !!osId,
    queryFn: async () => {
      const response = await api.get(`/ordens-servico/${osId}`);
      let notaFiscalServico = null;
      let notaFiscalPecas = null;

      try {
        const nfResponse = await api.get(`/notas-fiscais/os/${osId}`);
        const lista = Array.isArray(nfResponse.data) ? nfResponse.data : [];
        notaFiscalServico =
          lista.find((n) => n.modelo_documento === "NFSE") || null;
        notaFiscalPecas =
          lista.find((n) => n.modelo_documento === "NFE") || null;
      } catch {
        if (response.data.nf_id) {
          try {
            const legado = await api.get(
              `/notas-fiscais/${response.data.nf_id}`,
            );
            notaFiscalServico = legado.data;
          } catch {
            /* ignore */
          }
        }
      }

      return {
        os: response.data,
        notaFiscalServico,
        notaFiscalPecas,
      };
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ordemServico(osId) });
    queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
  }, [queryClient, osId]);

  useEffect(() => {
    if (query.isError) {
      toast.error("Erro ao carregar OS");
      navigate("/ordens-servico");
    }
  }, [query.isError, navigate]);

  return {
    os: query.data?.os ?? null,
    notaFiscalServico: query.data?.notaFiscalServico ?? null,
    notaFiscalPecas: query.data?.notaFiscalPecas ?? null,
    loading: query.isLoading,
    carregar: () => query.refetch(),
    invalidate,
    setNotaFiscalServico: (nf) => {
      queryClient.setQueryData(queryKeys.ordemServico(osId), (old) =>
        old ? { ...old, notaFiscalServico: nf } : old,
      );
    },
    setNotaFiscalPecas: (nf) => {
      queryClient.setQueryData(queryKeys.ordemServico(osId), (old) =>
        old ? { ...old, notaFiscalPecas: nf } : old,
      );
    },
  };
}
