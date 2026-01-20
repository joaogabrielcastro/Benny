import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { formatarMoeda } from "../utils/formatters";
import LoadingSpinner from "../components/LoadingSpinner";
import ProdutoFormModal from "../components/ProdutoFormModal";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [filtroEstoque, setFiltroEstoque] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    produtoId: null,
  });
  const wsRef = useRef(null);

  useEffect(() => {
    carregarProdutos();

    // Conectar WebSocket
    const conectarWebSocket = () => {
      try {
        // Detecta automaticamente: localhost em dev, wss em produção
        const wsUrl =
          window.location.hostname === "localhost"
            ? "ws://localhost:3001"
            : "wss://benny-oh3g.onrender.com";

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[ESTOQUE] WebSocket conectado");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("[ESTOQUE] Mensagem recebida:", data);
            if (data.type === "estoque_atualizado") {
              console.log(
                "[ESTOQUE] Recarregando produtos instantaneamente...",
              );
              carregarProdutos();
            }
          } catch (error) {
            console.error("[ESTOQUE] Erro ao processar mensagem:", error);
          }
        };

        ws.onerror = (error) => {
          console.warn(
            "[ESTOQUE] WebSocket não disponível, usando polling:",
            error,
          );
          // Não reconectar se der erro
          if (wsRef.current) {
            wsRef.current = null;
          }
        };

        ws.onclose = () => {
          console.log("[ESTOQUE] WebSocket desconectado");
          // Só reconectar se não foi por erro
          if (wsRef.current) {
            setTimeout(conectarWebSocket, 5000);
          }
        };
      } catch (error) {
        console.warn(
          "[ESTOQUE] WebSocket não suportado, continuando sem updates em tempo real",
        );
      }
    };

    conectarWebSocket();

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    filtrarProdutos();
  }, [busca, produtos, filtroEstoque]);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const response = await api.get("/produtos");
      // A API agora retorna { data: [...], pagination: {...} }
      setProdutos(
        Array.isArray(response.data) ? response.data : response.data.data || [],
      );
    } catch (error) {
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const filtrarProdutos = () => {
    let resultado = produtos;

    if (busca) {
      resultado = resultado.filter(
        (p) =>
          p.nome.toLowerCase().includes(busca.toLowerCase()) ||
          p.codigo.toLowerCase().includes(busca.toLowerCase()),
      );
    }

    if (filtroEstoque === "baixo") {
      resultado = resultado.filter((p) => p.quantidade <= p.estoque_minimo);
    } else if (filtroEstoque === "zerado") {
      resultado = resultado.filter((p) => p.quantidade === 0);
    }

    setProdutosFiltrados(resultado);
  };

  const handleEditar = (produto) => {
    setProdutoEditando(produto);
    setMostrarForm(true);
  };

  const handleDeletar = async (id) => {
    try {
      await api.delete(`/produtos/${id}`);
      toast.success("Produto deletado com sucesso!");
      setConfirmDialog({ isOpen: false, produtoId: null });
      carregarProdutos();
    } catch (error) {
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
    carregarProdutos();
  };

  if (loading) return <LoadingSpinner size="xl" />;

  return (
    <div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, produtoId: null })}
        onConfirm={() => handleDeletar(confirmDialog.produtoId)}
        title="Confirmar Exclusão"
        message="Deseja realmente deletar este produto? Esta ação não pode ser desfeita."
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Estoque
        </h1>
        <button
          onClick={handleNovo}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo Produto
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filtroEstoque}
            onChange={(e) => setFiltroEstoque(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os produtos</option>
            <option value="baixo">Estoque baixo</option>
            <option value="zerado">Estoque zerado</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
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
              {produtosFiltrados.map((produto) => (
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
                      onClick={() => handleEditar(produto)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-3 font-medium"
                    >
                      Editar
                    </button>
                    <button
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
              {produtosFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nenhum produto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarForm && (
        <ProdutoFormModal
          produto={produtoEditando}
          onClose={handleFecharForm}
        />
      )}
    </div>
  );
}
