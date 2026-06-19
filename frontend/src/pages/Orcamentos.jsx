import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import { useDebounce } from "../hooks/useDebounce";
import { useOrcamentosPaginated } from "../hooks/queries/useOrcamentosList";
import { formatarMoeda } from "../utils/formatters";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import LoadingSpinner from "../components/LoadingSpinner";

const ITEMS_PER_PAGE = 10;

export default function Orcamentos() {
  const queryClient = useQueryClient();
  const { confirm, dialogState, handleClose } = useConfirm();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status) setFiltroStatus(status);
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [buscaDebounced, filtroStatus]);

  const listParams = useMemo(() => {
    const p = { page: currentPage, limit: ITEMS_PER_PAGE };
    if (buscaDebounced) p.busca = buscaDebounced;
    if (filtroStatus) p.status = filtroStatus;
    return p;
  }, [currentPage, buscaDebounced, filtroStatus]);

  const { data, isLoading, isError, refetch } =
    useOrcamentosPaginated(listParams);

  const orcamentos = data?.rows ?? [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? 0;
  const totalPages = pagination?.pages ?? 1;

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar orçamentos");
  }, [isError]);

  const handleExcluirOrcamento = async (orc) => {
    const ok = await confirm({
      title: "Excluir orçamento",
      message: `Excluir o orçamento ${orc.numero}? Se houver OS vinculada, exclua a OS antes.`,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    try {
      await api.delete(`/orcamentos/${orc.id}`);
      toast.success("Orçamento excluído.");
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      refetch();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.erro ||
          "Erro ao excluir orçamento",
      );
    }
  };

  const formatarData = (d) => new Date(d).toLocaleString("pt-BR");

  const getStatusColor = (status) => {
    const colors = {
      Pendente: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      Aprovado: "bg-green-100 text-green-800 border border-green-300",
      Reprovado: "bg-red-100 text-red-800 border border-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border border-gray-300";
  };

  if (isLoading && !data) return <LoadingSpinner size="xl" />;

  return (
    <div className="page-enter">
      <PageHeader
        title="Orçamentos"
        subtitle="Crie, envie e aprove propostas para o cliente."
        actions={
          <Link to="/orcamentos/novo" className="btn-brand w-full sm:w-auto">
            Novo orçamento
          </Link>
        }
      />

      <div className="pro-card p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchBar
            onSearch={setBusca}
            placeholder="Buscar por número, cliente ou placa..."
          />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="input-pro"
          >
            <option value="">Todos os status</option>
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Reprovado">Reprovado</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Veículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {orcamentos.map((orc) => (
                <tr key={orc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 text-sm font-medium">{orc.numero}</td>
                  <td className="px-6 py-4 text-sm">{orc.cliente_nome}</td>
                  <td className="px-6 py-4 text-sm">
                    {orc.veiculo_modelo} - {orc.veiculo_placa}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    {formatarMoeda(orc.valor_total)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(orc.status)}`}
                    >
                      {orc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{formatarData(orc.criado_em)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/orcamentos/${orc.id}`}
                        className="text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Ver
                      </Link>
                      {orc.status === "Pendente" && (
                        <Link
                          to={`/orcamentos/${orc.id}/editar`}
                          className="text-amber-600 hover:text-amber-700 font-medium"
                        >
                          Editar
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleExcluirOrcamento(orc)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orcamentos.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    Nenhum orçamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
