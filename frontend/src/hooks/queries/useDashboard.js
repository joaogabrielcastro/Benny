import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { queryKeys } from "../../api/queryKeys";
import { unwrapListResponse, unwrapPagination } from "../../utils/apiList";

const valor = (r, fallback = null) => (r.status === "fulfilled" ? r.value.data : fallback);

/**
 * Dados do painel. Cada fonte é independente: se um recurso do plano estiver
 * desligado (ex.: agenda, relatórios), o restante do painel continua funcionando.
 */
export function useDashboardData() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const [relatorioRes, agendHojeRes, contasRes] = await Promise.allSettled([
        api.get("/relatorios/dashboard"),
        api.get("/agendamentos/hoje/lista"),
        api.get("/contas-pagar/alertas/resumo"),
      ]);
      if (relatorioRes.status === "rejected" && agendHojeRes.status === "rejected" && contasRes.status === "rejected") {
        throw relatorioRes.reason;
      }
      return {
        relatorio: valor(relatorioRes),
        agendamentosHoje: valor(agendHojeRes, []),
        alertasContas: valor(contasRes, { vencidas: [], aVencer: [] }),
      };
    },
  });
}

async function contagemOs(status) {
  const { data } = await api.get("/ordens-servico", { params: { status, limit: 1, page: 1 } });
  return unwrapPagination(data)?.total ?? 0;
}

/** Fontes extras do painel inicial (OS na oficina, financeiro, estoque). */
export function usePainelOperacional() {
  return useQuery({
    queryKey: ["painel", "operacional"],
    staleTime: 30_000,
    refetchInterval: 2 * 60_000,
    queryFn: async () => {
      const [abertas, andamento, finalizadas, naOficina, financeiro, estoqueBaixo, orcPendentes] = await Promise.allSettled([
        contagemOs("Aberta"),
        contagemOs("Em andamento"),
        contagemOs("Finalizada"),
        api.get("/ordens-servico", { params: { limit: 50, page: 1, ordenar: "criado_em", direcao: "asc", status: "Em andamento" } }),
        api.get("/financeiro/resumo"),
        api.get("/produtos/alertas/estoque-baixo"),
        api.get("/orcamentos", { params: { status: "Pendente", limit: 5, page: 1 } }),
      ]);
      const abertasLista = await api
        .get("/ordens-servico", { params: { limit: 50, page: 1, ordenar: "criado_em", direcao: "asc", status: "Aberta" } })
        .then((r) => unwrapListResponse(r.data))
        .catch(() => []);
      return {
        osAbertas: abertas.status === "fulfilled" ? abertas.value : null,
        osAndamento: andamento.status === "fulfilled" ? andamento.value : null,
        osFinalizadas: finalizadas.status === "fulfilled" ? finalizadas.value : null,
        naOficina: [
          ...(naOficina.status === "fulfilled" ? unwrapListResponse(naOficina.value.data) : []),
          ...abertasLista,
        ],
        financeiro: valor(financeiro),
        estoqueBaixo: valor(estoqueBaixo, []) || [],
        orcamentosPendentes:
          orcPendentes.status === "fulfilled"
            ? {
                total: unwrapPagination(orcPendentes.value.data)?.total ?? unwrapListResponse(orcPendentes.value.data).length,
                lista: unwrapListResponse(orcPendentes.value.data),
              }
            : null,
      };
    },
  });
}
