import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FiPlus, FiSliders, FiTrash2, FiChevronRight, FiTool, FiX } from "react-icons/fi";
import api from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import { useOrdensServicoPaginated } from "../hooks/queries/useOrdensServicoList";
import { formatarMoeda, formatarData } from "../utils/formatters";
import { unwrapPagination } from "../utils/apiList";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import SortableHeader from "../components/SortableHeader";
import PageHeader from "../components/layout/PageHeader";
import ClienteAutocomplete from "../components/ClienteAutocomplete";
import StatusBadge from "../components/ui/StatusBadge";
import FilterChips from "../components/ui/FilterChips";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { TONES, STATUS_TONE } from "../utils/statusColors";
import { useAuth } from "../contexts/AuthContext";
import {
  OS_STATUS,
  situacaoPagamentoOs,
  rotuloVeiculoSemPlaca,
  formatarPlaca,
  tempoRelativo,
} from "../features/os/osHelpers";

const ITEMS_PER_PAGE = 15;

function useContagemStatus(base) {
  const results = useQueries({
    queries: ["", ...OS_STATUS].map((status) => ({
      queryKey: ["ordens-servico", "contagem", status, base],
      queryFn: async () => {
        const { data } = await api.get("/ordens-servico", {
          params: { ...base, ...(status ? { status } : {}), limit: 1, page: 1 },
        });
        return unwrapPagination(data)?.total ?? 0;
      },
      staleTime: 30_000,
    })),
  });
  return Object.fromEntries(
    ["", ...OS_STATUS].map((s, i) => [s, results[i].data]),
  );
}

export default function OrdensServico() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, dialogState, handleClose } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get("status") || "";
  const busca = searchParams.get("busca") || "";
  const page = Number(searchParams.get("page") || 1);
  const clienteId = searchParams.get("cliente_id") || "";
  const dataInicio = searchParams.get("data_inicio") || "";
  const dataFim = searchParams.get("data_fim") || "";
  const [mostrarFiltros, setMostrarFiltros] = useState(Boolean(clienteId || dataInicio || dataFim));
  const [sortConfig, setSortConfig] = useState({ field: "criado_em", direction: "desc" });

  const setParam = (patch, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === "" || v == null) next.delete(k);
      else next.set(k, String(v));
    }
    if (resetPage && !("page" in patch)) next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const filtrosBase = useMemo(() => {
    const p = {};
    if (busca) p.busca = busca;
    if (clienteId) p.cliente_id = clienteId;
    if (dataInicio) p.data_inicio = dataInicio;
    if (dataFim) p.data_fim = dataFim;
    return p;
  }, [busca, clienteId, dataInicio, dataFim]);

  const listParams = useMemo(
    () => ({
      ...filtrosBase,
      ...(status ? { status } : {}),
      page,
      limit: ITEMS_PER_PAGE,
      ordenar: sortConfig.field,
      direcao: sortConfig.direction,
    }),
    [filtrosBase, status, page, sortConfig],
  );

  const { data, isLoading, isFetching, isError } = useOrdensServicoPaginated(listParams);
  const contagem = useContagemStatus(filtrosBase);

  const ordens = data?.rows ?? [];
  const totalItems = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.pages ?? 1;

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar ordens de serviço");
  }, [isError]);

  const handleExcluirOs = async (os) => {
    const ok = await confirm({
      title: "Excluir ordem de serviço",
      message: `Excluir a ordem ${os.numero}? Movimentações de estoque desta OS serão desfeitas.`,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    try {
      await api.delete(`/ordens-servico/${os.id}`);
      toast.success("Ordem de serviço excluída.");
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.erro || "Erro ao excluir OS");
    }
  };

  const chips = [
    { value: "", label: "Todas", count: contagem[""] },
    ...OS_STATUS.map((s) => ({
      value: s,
      label: s,
      count: contagem[s],
      dot: TONES[STATUS_TONE.os[s]].dot,
    })),
  ];

  const filtrosAtivos = [clienteId, dataInicio, dataFim].filter(Boolean).length;

  return (
    <div className="page-enter">
      <PageHeader
        title="Ordens de serviço"
        subtitle="Acompanhe cada atendimento da entrada do veículo à entrega."
        actions={
          isAdmin ? (
            <Link to="/orcamentos/novo" className="btn-brand">
              <FiPlus className="h-4 w-4" />
              Novo atendimento
            </Link>
          ) : null
        }
      />

      <div className="space-y-3 mb-4">
        <FilterChips
          options={chips}
          value={status}
          onChange={(v) => setParam({ status: v })}
          ariaLabel="Filtrar por status"
        />
        <div className="flex gap-2">
          <SearchBar
            className="flex-1"
            defaultValue={busca}
            onSearch={(v) => v !== busca && setParam({ busca: v.trim() })}
            placeholder="Buscar por nº da OS, placa, cliente ou modelo…"
          />
          <button
            type="button"
            onClick={() => setMostrarFiltros((v) => !v)}
            className={`btn-secondary ${filtrosAtivos ? "!border-brand-400 !text-brand-700 dark:!text-brand-300" : ""}`}
            aria-expanded={mostrarFiltros}
          >
            <FiSliders className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
            {filtrosAtivos > 0 && (
              <span className="num rounded-full bg-brand-600 text-white text-2xs px-1.5">{filtrosAtivos}</span>
            )}
          </button>
        </div>

        {mostrarFiltros && (
          <div className="pro-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
            <div>
              <label className="label-pro">Cliente</label>
              <ClienteAutocomplete
                key={clienteId || "nenhum"}
                value={clienteId}
                onChange={(id) => setParam({ cliente_id: id || "" })}
                onClienteSelecionado={(c) => !c && setParam({ cliente_id: "" })}
              />
            </div>
            <div>
              <label className="label-pro" htmlFor="f-inicio">Abertas a partir de</label>
              <input
                id="f-inicio"
                type="date"
                className="input-pro"
                value={dataInicio}
                onChange={(e) => setParam({ data_inicio: e.target.value })}
              />
            </div>
            <div>
              <label className="label-pro" htmlFor="f-fim">Até</label>
              <input
                id="f-fim"
                type="date"
                className="input-pro"
                value={dataFim}
                onChange={(e) => setParam({ data_fim: e.target.value })}
              />
            </div>
            {filtrosAtivos > 0 && (
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setParam({ cliente_id: "", data_inicio: "", data_fim: "" })}
                >
                  <FiX className="h-3.5 w-3.5" />
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pro-card overflow-hidden relative">
        {isFetching && !isLoading && (
          <div className="absolute top-0 inset-x-0 h-0.5 bg-brand-500/70 animate-pulse z-10" />
        )}

        {isLoading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : ordens.length === 0 ? (
          <EmptyState
            icon={FiTool}
            title={busca || status || filtrosAtivos ? "Nenhuma OS encontrada" : "Nenhuma ordem de serviço ainda"}
            description={
              busca || status || filtrosAtivos
                ? "Ajuste a busca ou os filtros para ver outros atendimentos."
                : "As OS são geradas ao aprovar um orçamento."
            }
            action={
              isAdmin && !busca && !status ? (
                <Link to="/orcamentos/novo" className="btn-brand">
                  <FiPlus className="h-4 w-4" /> Novo atendimento
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            {/* Desktop / tablet */}
            <div className="hidden md:block overflow-x-auto">
              <table className="table-pro">
                <thead>
                  <tr>
                    <SortableHeader label="OS" field="numero" currentSort={sortConfig} onSort={(f, d) => setSortConfig({ field: f, direction: d })} />
                    <SortableHeader label="Cliente / veículo" field="cliente_nome" currentSort={sortConfig} onSort={(f, d) => setSortConfig({ field: f, direction: d })} />
                    <SortableHeader label="Status" field="status" currentSort={sortConfig} onSort={(f, d) => setSortConfig({ field: f, direction: d })} />
                    {isAdmin && <th>Pagamento</th>}
                    <SortableHeader label="Valor" field="valor_total" currentSort={sortConfig} onSort={(f, d) => setSortConfig({ field: f, direction: d })} className="text-right" />
                    <SortableHeader label="Abertura" field="criado_em" currentSort={sortConfig} onSort={(f, d) => setSortConfig({ field: f, direction: d })} />
                    <th className="w-0"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {ordens.map((os) => {
                    const sit = situacaoPagamentoOs(os);
                    return (
                      <tr
                        key={os.id}
                        className="row-link group"
                        onClick={() => navigate(`/ordens-servico/${os.id}`)}
                      >
                        <td className="whitespace-nowrap">
                          <Link
                            to={`/ordens-servico/${os.id}`}
                            className="font-semibold text-ink-900 dark:text-white num hover:text-brand-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {os.numero}
                          </Link>
                        </td>
                        <td className="max-w-[22rem]">
                          <p className="font-medium text-ink-900 dark:text-ink-100 truncate">{os.cliente_nome}</p>
                          <p className="text-xs text-ink-500 truncate">
                            <span className="font-mono font-medium text-ink-700 dark:text-ink-300">{formatarPlaca(os.veiculo_placa)}</span>
                            {" · "}
                            {rotuloVeiculoSemPlaca(os)}
                          </p>
                        </td>
                        <td><StatusBadge kind="os" status={os.status} /></td>
                        {isAdmin && (
                          <td>
                            {sit && os.status !== "Cancelada" ? (
                              <StatusBadge kind="situacaoPagamento" status={sit} size="sm" />
                            ) : (
                              <span className="text-ink-400">—</span>
                            )}
                          </td>
                        )}
                        <td className="text-right font-semibold text-ink-900 dark:text-ink-100 num whitespace-nowrap">
                          {formatarMoeda(os.valor_total)}
                        </td>
                        <td className="whitespace-nowrap">
                          <p className="text-ink-700 dark:text-ink-300 num">{formatarData(os.criado_em)}</p>
                          <p className="text-xs text-ink-500">{tempoRelativo(os.criado_em)}</p>
                        </td>
                        <td className="whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExcluirOs(os);
                                }}
                                className="btn-ghost btn-sm !px-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-400 hover:!text-red-600"
                                title={`Excluir ${os.numero}`}
                                aria-label={`Excluir ${os.numero}`}
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            )}
                            <FiChevronRight className="h-4 w-4 text-ink-300 group-hover:text-ink-500" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <ul className="md:hidden divide-y divide-ink-100 dark:divide-ink-800">
              {ordens.map((os) => (
                <li key={os.id}>
                  <Link
                    to={`/ordens-servico/${os.id}`}
                    className="block px-4 py-3.5 active:bg-ink-50 dark:active:bg-ink-850"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink-900 dark:text-white num">{os.numero}</span>
                      <StatusBadge kind="os" status={os.status} size="sm" />
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink-800 dark:text-ink-100 truncate">{os.cliente_nome}</p>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-ink-500">
                      <span className="truncate">
                        <span className="font-mono font-medium text-ink-700 dark:text-ink-300">{formatarPlaca(os.veiculo_placa)}</span>
                        {" · "}
                        {rotuloVeiculoSemPlaca(os)}
                      </span>
                      <span className="font-semibold text-ink-900 dark:text-ink-100 num shrink-0">
                        {formatarMoeda(os.valor_total)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-2xs text-ink-400">Aberta {tempoRelativo(os.criado_em)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => setParam({ page: p > 1 ? p : "" }, false)}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={totalItems}
        />
      </div>

      <ConfirmDialog
        open={!!dialogState}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        cancelLabel={dialogState?.cancelLabel}
        onCancel={() => handleClose(false)}
        onConfirm={() => handleClose(true)}
      />
    </div>
  );
}
