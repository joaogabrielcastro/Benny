import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiPlus, FiFileText, FiEdit2, FiTrash2, FiChevronRight } from "react-icons/fi";
import FilterChips from "../components/ui/FilterChips";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { TONES } from "../utils/statusColors";
import { tempoRelativo } from "../features/os/osHelpers";
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
import { rotuloVeiculo } from "../features/veiculos/rotuloVeiculo";

const ITEMS_PER_PAGE = 15;

export default function Orcamentos() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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

  const chips = [
    { value: "", label: "Todos" },
    { value: "Pendente", label: "Aguardando cliente", dot: TONES.violet.dot },
    { value: "Aprovado", label: "Aprovados", dot: TONES.green.dot },
    { value: "Reprovado", label: "Reprovados", dot: TONES.gray.dot },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title="Orçamentos"
        subtitle="Monte a proposta, envie o link ao cliente e aprove para abrir a OS."
        actions={
          <Link to="/orcamentos/novo" className="btn-brand">
            <FiPlus className="h-4 w-4" />
            Novo orçamento
          </Link>
        }
      />

      <div className="space-y-3 mb-4">
        <FilterChips options={chips} value={filtroStatus} onChange={setFiltroStatus} ariaLabel="Filtrar por status" />
        <SearchBar onSearch={setBusca} placeholder="Buscar por número, cliente ou placa…" />
      </div>

      <div className="pro-card overflow-hidden">
        {isLoading && !data ? (
          <SkeletonRows rows={6} cols={5} />
        ) : orcamentos.length === 0 ? (
          <EmptyState
            icon={FiFileText}
            title={buscaDebounced || filtroStatus ? "Nenhum orçamento encontrado" : "Nenhum orçamento ainda"}
            description={buscaDebounced || filtroStatus ? "Ajuste a busca ou o filtro." : "Crie um orçamento para iniciar um atendimento."}
            action={
              <Link to="/orcamentos/novo" className="btn-brand">
                <FiPlus className="h-4 w-4" /> Novo orçamento
              </Link>
            }
          />
        ) : (
          <table className="table-pro">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente / veículo</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="text-right">Valor</th>
                <th className="hidden md:table-cell">Criado</th>
                <th className="text-right"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((orc) => (
                <tr key={orc.id} className="row-link group" onClick={() => navigate(`/orcamentos/${orc.id}`)}>
                  <td className="whitespace-nowrap">
                    <Link
                      to={`/orcamentos/${orc.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold num text-ink-900 dark:text-white hover:text-brand-600"
                    >
                      {orc.numero}
                    </Link>
                    <div className="sm:hidden mt-1">
                      <StatusBadge kind="orcamento" status={orc.status} size="sm" />
                    </div>
                  </td>
                  <td className="max-w-[20rem]">
                    <p className="font-medium text-ink-900 dark:text-ink-100 truncate">{orc.cliente_nome}</p>
                    <p className="text-xs text-ink-500 truncate">
                      {rotuloVeiculo({
                        marca: orc.veiculo_marca,
                        modelo: orc.veiculo_modelo,
                        versao: orc.veiculo_versao,
                        motor: orc.veiculo_motor,
                        ano: orc.veiculo_ano,
                        placa: orc.veiculo_placa,
                      })}
                    </p>
                  </td>
                  <td className="hidden sm:table-cell">
                    <StatusBadge kind="orcamento" status={orc.status} />
                  </td>
                  <td className="text-right font-semibold num text-ink-900 dark:text-ink-100 whitespace-nowrap">
                    {formatarMoeda(orc.valor_total)}
                  </td>
                  <td className="hidden md:table-cell whitespace-nowrap">
                    <span className="num">{new Date(orc.criado_em).toLocaleDateString("pt-BR")}</span>
                    <span className="block text-xs text-ink-500">{tempoRelativo(orc.criado_em)}</span>
                  </td>
                  <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {orc.status === "Pendente" && (
                        <Link to={`/orcamentos/${orc.id}/editar`} className="btn-ghost btn-sm" title="Editar">
                          <FiEdit2 className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline">Editar</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleExcluirOrcamento(orc)}
                        className="btn-ghost btn-sm !px-1.5 text-ink-400 hover:!text-red-600"
                        title={`Excluir ${orc.numero}`}
                        aria-label={`Excluir ${orc.numero}`}
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                      <FiChevronRight className="hidden sm:block h-4 w-4 text-ink-300 group-hover:text-ink-500" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
