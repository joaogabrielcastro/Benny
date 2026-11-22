import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../services/api";
import { formatarMoeda } from "../utils/formatters";
import { useDebounce } from "../hooks/useDebounce";
import { useServicosPaginated } from "../hooks/queries/useServicosList";
import { FiPlus, FiEdit2, FiTrash2, FiClipboard } from "react-icons/fi";
import FilterChips from "../components/ui/FilterChips";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import ServicoFormModal, { useCategorias, formatarDuracao } from "../components/ServicoFormModal";
import ConfirmDialog from "../components/ConfirmDialog";

const ITEMS_PER_PAGE = 20;

export default function Servicos() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoria, setCategoria] = useState("");
  const { data: categorias = [] } = useCategorias("servicos");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [servicoEditando, setServicoEditando] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    servicoId: null,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [buscaDebounced, categoria]);

  const listParams = useMemo(() => {
    const p = { page: currentPage, limit: ITEMS_PER_PAGE };
    if (buscaDebounced) p.busca = buscaDebounced;
    if (categoria) p.categoria = categoria;
    return p;
  }, [currentPage, buscaDebounced, categoria]);

  const { data, isLoading, isError, refetch } = useServicosPaginated(listParams);

  const servicos = data?.rows ?? [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? 0;
  const totalPages = pagination?.pages ?? 1;

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar serviços");
  }, [isError]);

  const handleEditar = (servico) => {
    setServicoEditando(servico);
    setMostrarForm(true);
  };

  const handleDeletar = async (id) => {
    try {
      await api.delete(`/servicos/${id}`);
      toast.success("Serviço excluído com sucesso!");
      setConfirmDialog({ isOpen: false, servicoId: null });
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      refetch();
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Erro ao excluir serviço",
      );
      setConfirmDialog({ isOpen: false, servicoId: null });
    }
  };

  const handleNovo = () => {
    setServicoEditando(null);
    setMostrarForm(true);
  };

  const handleFecharForm = () => {
    setMostrarForm(false);
    setServicoEditando(null);
    queryClient.invalidateQueries({ queryKey: ["servicos"] });
  };

  const mensagemListaVazia =
    totalItems === 0 && !buscaDebounced
      ? "Nenhum serviço cadastrado."
      : "Nenhum serviço corresponde à busca.";

  const chips = [{ value: "", label: "Todas" }, ...categorias.map((c) => ({ value: c, label: c }))];

  return (
    <div className="page-enter">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, servicoId: null })}
        onConfirm={() => handleDeletar(confirmDialog.servicoId)}
        title="Excluir serviço"
        message="Deseja realmente excluir este serviço do catálogo? Orçamentos e OS já lançados não são alterados."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
      />

      <PageHeader
        title="Serviços"
        subtitle="Catálogo de mão de obra com preço e tempo padrão, usado em orçamentos e OS."
        actions={
          <button type="button" onClick={handleNovo} className="btn-brand">
            <FiPlus className="h-4 w-4" />
            Novo serviço
          </button>
        }
      />

      <div className="space-y-3 mb-4">
        {categorias.length > 0 && (
          <FilterChips options={chips} value={categoria} onChange={setCategoria} ariaLabel="Filtrar por categoria" />
        )}
        <SearchBar onSearch={setBusca} placeholder="Buscar por nome, código ou descrição…" />
      </div>

      <div className="pro-card overflow-hidden">
        {isLoading && !data ? (
          <SkeletonRows rows={6} cols={4} />
        ) : servicos.length === 0 ? (
          <EmptyState
            icon={FiClipboard}
            title={mensagemListaVazia}
            action={
              !buscaDebounced && !categoria && (
                <button type="button" onClick={handleNovo} className="btn-brand">
                  <FiPlus className="h-4 w-4" /> Novo serviço
                </button>
              )
            }
          />
        ) : (
          <table className="table-pro">
            <thead>
              <tr>
                <th>Serviço</th>
                <th className="hidden md:table-cell">Categoria</th>
                <th className="hidden sm:table-cell text-right">Tempo</th>
                <th className="text-right">Preço</th>
                <th className="text-right"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((servico) => (
                <tr key={servico.id}>
                  <td className="max-w-[28rem]">
                    <p className="font-medium text-ink-900 dark:text-white">{servico.nome}</p>
                    <p className="text-xs text-ink-500 truncate">
                      <span className="font-mono">{servico.codigo}</span>
                      {servico.descricao ? ` · ${servico.descricao}` : ""}
                    </p>
                  </td>
                  <td className="hidden md:table-cell">
                    {servico.categoria ? (
                      <span className="inline-flex rounded-md bg-ink-100 dark:bg-ink-800 px-2 py-0.5 text-xs text-ink-700 dark:text-ink-300">
                        {servico.categoria}
                      </span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell text-right num text-ink-600 dark:text-ink-300">
                    {formatarDuracao(servico.tempo_estimado_min) || <span className="text-ink-400">—</span>}
                  </td>
                  <td className="text-right font-semibold num text-ink-900 dark:text-ink-100 whitespace-nowrap">
                    {formatarMoeda(servico.valor_unitario)}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button type="button" onClick={() => handleEditar(servico)} className="btn-ghost btn-sm">
                      <FiEdit2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDialog({ isOpen: true, servicoId: servico.id })}
                      className="btn-ghost btn-sm !px-1.5 text-ink-400 hover:!text-red-600"
                      aria-label={`Excluir ${servico.nome}`}
                      title="Excluir"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
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

      {mostrarForm && (
        <ServicoFormModal servico={servicoEditando} isOpen={mostrarForm} onClose={handleFecharForm} onSaved={() => queryClient.invalidateQueries({ queryKey: ["servicos"] })} />
      )}
    </div>
  );
}
