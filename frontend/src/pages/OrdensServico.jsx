import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import { useDebounce } from "../hooks/useDebounce";
import {
  useOrdensServicoPaginated,
  useClientesList,
} from "../hooks/queries/useOrdensServicoList";
import { formatarMoeda } from "../utils/formatters";
import AdvancedFilters from "../components/AdvancedFilters";
import LoadingSpinner from "../components/LoadingSpinner";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import SortableHeader from "../components/SortableHeader";
import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../contexts/AuthContext";

const ITEMS_PER_PAGE = 10;

export default function OrdensServico() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { confirm, dialogState, handleClose } = useConfirm();
  const { data: clientes = [] } = useClientesList();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    field: "criado_em",
    direction: "desc",
  });
  const [advanced, setAdvanced] = useState({
    cliente_id: "",
    data_inicio: "",
    data_fim: "",
  });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status) setFiltroStatus(status);
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [buscaDebounced, filtroStatus, advanced, sortConfig]);

  const listParams = useMemo(() => {
    const p = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      ordenar: sortConfig.field,
      direcao: sortConfig.direction,
    };
    if (buscaDebounced) p.busca = buscaDebounced;
    if (filtroStatus) p.status = filtroStatus;
    if (advanced.cliente_id) p.cliente_id = advanced.cliente_id;
    if (advanced.data_inicio) p.data_inicio = advanced.data_inicio;
    if (advanced.data_fim) p.data_fim = advanced.data_fim;
    return p;
  }, [currentPage, buscaDebounced, filtroStatus, advanced, sortConfig]);

  const { data, isLoading, isError, refetch } =
    useOrdensServicoPaginated(listParams);

  const ordens = data?.rows ?? [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? 0;
  const totalPages = pagination?.pages ?? 1;

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
      refetch();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.erro ||
          "Erro ao excluir OS",
      );
    }
  };

  const handleAdvancedFilter = (filters) => {
    setAdvanced({
      cliente_id: filters.cliente || "",
      data_inicio: filters.dataInicio || "",
      data_fim: filters.dataFim || "",
    });
    if (filters.status) setFiltroStatus(filters.status);
    toast.success("Filtros aplicados");
  };

  const handleSort = (field, direction) => {
    setSortConfig({ field, direction });
  };

  if (isLoading && !data) return <LoadingSpinner size="xl" />;

  const formatarData = (d) => new Date(d).toLocaleString("pt-BR");

  const getStatusColor = (status) => {
    const colors = {
      Aberta: "bg-blue-100 text-blue-800 border border-blue-300",
      "Em andamento": "bg-yellow-100 text-yellow-800 border border-yellow-300",
      Finalizada: "bg-green-100 text-green-800 border border-green-300",
      Cancelada: "bg-red-100 text-red-800 border border-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border border-gray-300";
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Ordens de serviço"
        subtitle="Gerencie atendimentos, status e faturamento."
        actions={
          isAdmin ? (
            <Link to="/orcamentos/novo" className="btn-brand w-full sm:w-auto">
              Nova OS
            </Link>
          ) : null
        }
      />

      <AdvancedFilters onFilter={handleAdvancedFilter} clientes={clientes} />

      <div className="pro-card p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchBar
            onSearch={setBusca}
            placeholder="Buscar por número, cliente, placa ou modelo..."
          />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="input-pro"
          >
            <option value="">Todos os status</option>
            <option value="Aberta">Aberta</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Finalizada">Finalizada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      <div className="pro-card overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        <div className="hidden md:block overflow-x-auto">
          <table className="table-pro">
            <thead>
              <tr>
                <SortableHeader
                  label="Número"
                  field="numero"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Cliente"
                  field="cliente_nome"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Veículo
                </th>
                <SortableHeader
                  label="Valor Total"
                  field="valor_total"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Status"
                  field="status"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Data"
                  field="criado_em"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {ordens.map((os) => (
                <tr
                  key={os.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                    {os.numero}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {os.cliente_nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {os.veiculo_modelo} - {os.veiculo_placa}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-200">
                    {formatarMoeda(os.valor_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(os.status)}`}
                    >
                      {os.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {formatarData(os.criado_em)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={`/ordens-servico/${os.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800"
                      >
                        Ver Detalhes
                      </Link>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleExcluirOs(os)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 font-medium"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {ordens.length === 0 && !isLoading && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nenhuma ordem de serviço encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {ordens.map((os) => (
            <div key={os.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {os.numero}
                </p>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(os.status)}`}
                >
                  {os.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {os.cliente_nome} · {formatarMoeda(os.valor_total)}
              </p>
              <div className="flex gap-3">
                <Link
                  to={`/ordens-servico/${os.id}`}
                  className="text-sm font-medium text-blue-600"
                >
                  Ver Detalhes
                </Link>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleExcluirOs(os)}
                    className="text-sm font-medium text-red-600"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
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
