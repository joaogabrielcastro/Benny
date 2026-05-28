import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../services/api";
import { formatarMoeda } from "../utils/formatters";
import { useDebounce } from "../hooks/useDebounce";
import { useProdutosPaginated } from "../hooks/queries/useProdutosList";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import ProdutoFormModal from "../components/ProdutoFormModal";
import ConfirmDialog from "../components/ConfirmDialog";

const ITEMS_PER_PAGE = 10;

export default function Estoque() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca);
  const [filtroEstoque, setFiltroEstoque] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    produtoId: null,
  });
  const wsRef = useRef(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [buscaDebounced, filtroEstoque]);

  const listParams = useMemo(() => {
    const p = { page: currentPage, limit: ITEMS_PER_PAGE };
    if (buscaDebounced) p.busca = buscaDebounced;
    if (filtroEstoque === "baixo" || filtroEstoque === "zerado") {
      p.estoque = filtroEstoque;
    }
    return p;
  }, [currentPage, buscaDebounced, filtroEstoque]);

  const { data, isLoading, isError, refetch } = useProdutosPaginated(listParams);

  const produtos = data?.rows ?? [];
  const pagination = data?.pagination;
  const totalItems = pagination?.total ?? 0;
  const totalPages = pagination?.pages ?? 1;

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar produtos");
  }, [isError]);

  useEffect(() => {
    const invalidar = () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    };

    const conectarWebSocket = () => {
      try {
        const wsUrl =
          window.location.hostname === "localhost"
            ? "ws://localhost:3001"
            : "wss://benny-oh3g.onrender.com";

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "estoque_atualizado") invalidar();
          } catch {
            /* ignore */
          }
        };

        ws.onerror = () => {
          wsRef.current = null;
        };

        ws.onclose = () => {
          if (wsRef.current) setTimeout(conectarWebSocket, 5000);
        };
      } catch {
        /* WebSocket opcional */
      }
    };

    conectarWebSocket();

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [queryClient]);

  const handleEditar = (produto) => {
    setProdutoEditando(produto);
    setMostrarForm(true);
  };

  const handleDeletar = async (id) => {
    try {
      await api.delete(`/produtos/${id}`);
      toast.success("Produto deletado com sucesso!");
      setConfirmDialog({ isOpen: false, produtoId: null });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      refetch();
    } catch {
      toast.error("Erro ao deletar produto");
      setConfirmDialog({ isOpen: false, produtoId: null });
    }
  };

  const handleNovo = () => {
    setProdutoEditando(null);
    setMostrarForm(true);
  };

  const handleFecharForm = () => {
    setMostrarForm(false);
    setProdutoEditando(null);
    queryClient.invalidateQueries({ queryKey: ["produtos"] });
  };

  const mensagemListaVazia =
    totalItems === 0 && !buscaDebounced && filtroEstoque === "todos"
      ? "Nenhum produto cadastrado."
      : "Nenhum produto corresponde à busca ou ao filtro selecionado.";

  if (isLoading && !data) return <LoadingSpinner size="xl" />;

  return (
    <div className="page-enter">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, produtoId: null })}
        onConfirm={() => handleDeletar(confirmDialog.produtoId)}
        title="Confirmar Exclusão"
        message="Deseja realmente deletar este produto? Esta ação não pode ser desfeita."
      />

      <PageHeader
        title="Estoque"
        subtitle="Produtos, quantidades e alertas de estoque baixo."
        actions={
          <button type="button" onClick={handleNovo} className="btn-brand w-full sm:w-auto">
            Novo produto
          </button>
        }
      />

      <div className="pro-card p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchBar
            onSearch={setBusca}
            placeholder="Buscar por nome ou código..."
          />
          <select
            value={filtroEstoque}
            onChange={(e) => setFiltroEstoque(e.target.value)}
            className="input-pro"
          >
            <option value="todos">Todos os produtos</option>
            <option value="baixo">Estoque baixo</option>
            <option value="zerado">Estoque zerado</option>
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
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Valor Custo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Valor Venda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {produtos.map((produto) => (
                <tr
                  key={produto.id}
                  className={
                    produto.quantidade <= produto.estoque_minimo
                      ? "bg-red-50 dark:bg-red-900/20"
                      : ""
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {produto.codigo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {produto.nome}
                    {produto.quantidade <= produto.estoque_minimo && (
                      <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-semibold">
                        ESTOQUE BAIXO
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {produto.quantidade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {formatarMoeda(produto.valor_custo)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {formatarMoeda(produto.valor_venda)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      type="button"
                      onClick={() => handleEditar(produto)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          produtoId: produto.id,
                        })
                      }
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
              {produtos.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
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
          {produtos.map((produto) => (
            <div
              key={produto.id}
              className={`p-4 space-y-2 ${
                produto.quantidade <= produto.estoque_minimo
                  ? "bg-red-50 dark:bg-red-900/20"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {produto.codigo}
                  </p>
                </div>
                {produto.quantidade <= produto.estoque_minimo && (
                  <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                    ESTOQUE BAIXO
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Produto</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {produto.nome}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Qtd</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {produto.quantidade}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Custo</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {formatarMoeda(produto.valor_custo)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Venda</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatarMoeda(produto.valor_venda)}
                  </p>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleEditar(produto)}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmDialog({
                      isOpen: true,
                      produtoId: produto.id,
                    })
                  }
                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
          {produtos.length === 0 && (
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
        <ProdutoFormModal
          produto={produtoEditando}
          produtosExistentes={produtos}
          onClose={handleFecharForm}
        />
      )}
    </div>
  );
}
