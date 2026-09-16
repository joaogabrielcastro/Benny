import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../services/api";
import { formatarMoeda } from "../utils/formatters";
import { useDebounce } from "../hooks/useDebounce";
import { useServicosPaginated } from "../hooks/queries/useServicosList";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import ServicoFormModal from "../components/ServicoFormModal";
import ConfirmDialog from "../components/ConfirmDialog";

const ITEMS_PER_PAGE = 10;

export default function Servicos() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca);
  const [currentPage, setCurrentPage] = useState(1);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [servicoEditando, setServicoEditando] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    servicoId: null,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [buscaDebounced]);

  const listParams = useMemo(() => {
    const p = { page: currentPage, limit: ITEMS_PER_PAGE };
    if (buscaDebounced) p.busca = buscaDebounced;
    return p;
  }, [currentPage, buscaDebounced]);

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
    refetch();
  };

  const mensagemListaVazia =
    totalItems === 0 && !buscaDebounced
      ? "Nenhum serviço cadastrado."
      : "Nenhum serviço corresponde à busca.";

  if (isLoading && !data) return <LoadingSpinner size="xl" />;

  return (
    <div className="page-enter">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, servicoId: null })}
        onConfirm={() => handleDeletar(confirmDialog.servicoId)}
        title="Confirmar exclusão"
        message="Deseja realmente excluir este serviço? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
      />

      <PageHeader
        title="Serviços"
        subtitle="Catálogo de mão de obra e serviços usados em orçamentos e OS."
        actions={
          <button
            type="button"
            onClick={handleNovo}
            className="btn-brand w-full sm:w-auto"
          >
            Novo serviço
          </button>
        }
      />

      <div className="pro-card p-4 sm:p-6 mb-6">
        <SearchBar
          onSearch={setBusca}
          placeholder="Buscar por nome, código ou descrição..."
        />
      </div>

      <div className="pro-card overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Valor unit.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {servicos.map((servico) => (
                <tr key={servico.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {servico.codigo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {servico.nome}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {servico.descricao || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {formatarMoeda(servico.valor_unitario)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      type="button"
                      onClick={() => handleEditar(servico)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          servicoId: servico.id,
                        })
                      }
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {servicos.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    {mensagemListaVazia}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {servicos.map((servico) => (
            <div key={servico.id} className="p-4 space-y-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {servico.codigo}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Nome</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {servico.nome}
                </p>
              </div>
              {servico.descricao ? (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Descrição
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {servico.descricao}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Valor unit.
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatarMoeda(servico.valor_unitario)}
                </p>
              </div>
              <div className="pt-1 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleEditar(servico)}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      servicoId: servico.id,
                    })
                  }
                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {servicos.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              {mensagemListaVazia}
            </div>
          )}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={totalItems}
      />

      {mostrarForm && (
        <ServicoFormModal
          servico={servicoEditando}
          isOpen={mostrarForm}
          onClose={handleFecharForm}
          onSaved={handleFecharForm}
        />
      )}
    </div>
  );
}
