import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { formatarMoeda } from "../utils/formatters";
import LoadingSpinner from "../components/LoadingSpinner";
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

  useEffect(() => {
    carregarProdutos();
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
        Array.isArray(response.data) ? response.data : response.data.data || []
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
          p.codigo.toLowerCase().includes(busca.toLowerCase())
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
      carregarProdutos();
    } catch (error) {
      toast.error("Erro ao deletar produto");
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
        <h1 className="text-3xl font-bold text-gray-800">Estoque</h1>
        <button
          onClick={handleNovo}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filtroEstoque}
            onChange={(e) => setFiltroEstoque(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os produtos</option>
            <option value="baixo">Estoque baixo</option>
            <option value="zerado">Estoque zerado</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Valor Custo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Valor Venda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {produtosFiltrados.map((produto) => (
                <tr
                  key={produto.id}
                  className={
                    produto.quantidade <= produto.estoque_minimo
                      ? "bg-red-50"
                      : ""
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {produto.codigo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {produto.nome}
                    {produto.quantidade <= produto.estoque_minimo && (
                      <span className="ml-2 text-xs text-red-600 font-semibold">
                        ESTOQUE BAIXO
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {produto.quantidade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatarMoeda(produto.valor_custo)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatarMoeda(produto.valor_venda)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEditar(produto)}
                      className="text-blue-600 hover:text-blue-800 mr-3 font-medium"
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
                      className="text-red-600 hover:text-red-800 font-medium"
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
                    className="px-6 py-8 text-center text-gray-500"
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

function ProdutoFormModal({ produto, onClose }) {
  const [formData, setFormData] = useState(
    produto || {
      codigo: "",
      nome: "",
      descricao: "",
      quantidade: 0,
      valor_custo: 0,
      valor_venda: 0,
      estoque_minimo: 5,
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: [
        "quantidade",
        "valor_custo",
        "valor_venda",
        "estoque_minimo",
      ].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (produto) {
        await api.put(`/produtos/${produto.id}`, formData);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await api.post("/produtos", formData);
        toast.success("Produto criado com sucesso!");
      }
      onClose();
    } catch (error) {
      toast.error(
        "Erro ao salvar produto: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {produto ? "Editar Produto" : "Novo Produto"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  name="quantidade"
                  value={formData.quantidade}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estoque Mínimo
                </label>
                <input
                  type="number"
                  name="estoque_minimo"
                  value={formData.estoque_minimo}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Custo
                </label>
                <input
                  type="number"
                  name="valor_custo"
                  value={formData.valor_custo}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Venda
                </label>
                <input
                  type="number"
                  name="valor_venda"
                  value={formData.valor_venda}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
