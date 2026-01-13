import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import api from "../services/api";
import OSImpressao from "../components/OSImpressao";

export default function OSDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [os, setOS] = useState(null);
  const [loading, setLoading] = useState(true);
  const componentRef = useRef();

  useEffect(() => {
    carregarOS();
  }, [id]);

  const carregarOS = async () => {
    try {
      const response = await api.get(`/ordens-servico/${id}`);
      setOS(response.data);
      setLoading(false);
    } catch (error) {
      alert("Erro ao carregar OS");
      navigate("/ordens-servico");
    }
  };

  const handleAtualizarStatus = async (novoStatus) => {
    try {
      await api.put(`/ordens-servico/${id}`, {
        status: novoStatus,
        responsavel_tecnico: os.responsavel_tecnico,
      });
      alert("Status atualizado com sucesso!");
      carregarOS();
    } catch (error) {
      alert("Erro ao atualizar status");
    }
  };

  const handleImprimir = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `OS_${os?.numero}`,
  });

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!os) {
    return <div className="text-center py-8">OS não encontrada</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Ordem de Serviço
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1 text-lg">
              {os.numero}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(os.status === "Aberta" || os.status === "Em andamento") && (
              <Link
                to={`/ordens-servico/${id}/editar`}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
              >
                ✏️ Editar
              </Link>
            )}
            {os.status === "Aberta" && (
              <button
                onClick={() => handleAtualizarStatus("Em andamento")}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                ▶️ Iniciar
              </button>
            )}
            {os.status === "Em andamento" && (
              <button
                onClick={() => handleAtualizarStatus("Finalizada")}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                ✓ Finalizar
              </button>
            )}
            {(os.status === "Aberta" || os.status === "Em andamento") && (
              <button
                onClick={() => handleAtualizarStatus("Cancelada")}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                ✕ Cancelar
              </button>
            )}
            <button
              onClick={handleImprimir}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
            >
              🖨️ Imprimir
            </button>
            <Link
              to="/ordens-servico"
              className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-semibold"
            >
              ← Voltar
            </Link>
          </div>
        </div>
      </div>

      {/* Badge de Status */}
      <div className="flex items-center gap-3">
        <span
          className={`px-6 py-3 rounded-xl font-bold text-lg ${
            os.status === "Aberta"
              ? "bg-blue-100 text-blue-700"
              : os.status === "Em andamento"
              ? "bg-yellow-100 text-yellow-700"
              : os.status === "Finalizada"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {os.status}
        </span>
        <span className="text-gray-600 dark:text-gray-300">
          Data: {new Date(os.criado_em).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {/* Grid de Informações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados do Cliente */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            👤 Cliente
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                Nome:
              </span>
              <p className="text-lg text-gray-800 dark:text-gray-200">
                {os.cliente_nome}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                Telefone:
              </span>
              <p className="text-lg text-gray-800 dark:text-gray-200">
                {os.cliente_telefone || "Não informado"}
              </p>
            </div>
            {os.cliente_cpf_cnpj && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  CPF/CNPJ:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.cliente_cpf_cnpj}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dados do Veículo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            🚗 Veículo
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                Modelo:
              </span>
              <p className="text-lg text-gray-800 dark:text-gray-200">
                {os.veiculo_modelo}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Placa:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.veiculo_placa}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Cor:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.veiculo_cor}
                </p>
              </div>
            </div>
            {os.km && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  KM:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.km.toLocaleString()}
                </p>
              </div>
            )}
            {os.observacoes_veiculo && (
              <div className="mt-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Observações:
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {os.observacoes_veiculo}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Produtos Utilizados */}
      {os.produtos && os.produtos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            📦 Produtos Utilizados
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Valor Unit.
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {os.produtos.map((produto, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {produto.codigo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {produto.descricao}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-800 dark:text-gray-200">
                      {produto.quantidade}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-gray-200">
                      {formatarMoeda(produto.valor_unitario)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                      {formatarMoeda(produto.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 dark:bg-gray-700 font-semibold">
                  <td
                    colSpan="4"
                    className="px-4 py-3 text-right text-gray-800 dark:text-gray-200"
                  >
                    Subtotal Produtos:
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                    {formatarMoeda(os.valor_produtos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Serviços Realizados */}
      {os.servicos && os.servicos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            🔧 Serviços Realizados
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Valor Unit.
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {os.servicos.map((servico, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {servico.codigo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {servico.descricao}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-800 dark:text-gray-200">
                      {servico.quantidade}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-gray-200">
                      {formatarMoeda(servico.valor_unitario)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                      {formatarMoeda(servico.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-50 dark:bg-gray-700 font-semibold">
                  <td
                    colSpan="4"
                    className="px-4 py-3 text-right text-gray-800 dark:text-gray-200"
                  >
                    Subtotal Serviços:
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                    {formatarMoeda(os.valor_servicos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Valor Total */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center text-white">
          <span className="text-2xl font-bold">VALOR TOTAL DA OS:</span>
          <span className="text-4xl font-bold">
            {formatarMoeda(os.valor_total)}
          </span>
        </div>
      </div>

      {/* Observações Gerais */}
      {os.observacoes_gerais && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            📝 Observações Gerais
          </h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {os.observacoes_gerais}
          </p>
        </div>
      )}

      {/* Responsável Técnico */}
      {os.responsavel_tecnico && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            👨‍🔧 Responsável Técnico
          </h2>
          <p className="text-lg text-gray-800 dark:text-gray-200">
            {os.responsavel_tecnico}
          </p>
        </div>
      )}

      {/* Componente de Impressão (oculto) */}
      <OSImpressao ref={componentRef} os={os} />
    </div>
  );
}
