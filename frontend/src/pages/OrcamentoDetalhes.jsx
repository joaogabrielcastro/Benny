import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function OrcamentoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarOrcamento();
  }, [id]);

  const carregarOrcamento = async () => {
    try {
      const response = await api.get(`/orcamentos/${id}`);
      setOrcamento(response.data);
      setLoading(false);
    } catch (error) {
      alert("Erro ao carregar orçamento");
      navigate("/orcamentos");
    }
  };

  const handleAtualizarStatus = async (novoStatus) => {
    try {
      await api.put(`/orcamentos/${id}`, {
        status: novoStatus,
        km: orcamento.km,
        observacoes_veiculo: orcamento.observacoes_veiculo,
        observacoes_gerais: orcamento.observacoes_gerais,
        produtos: orcamento.produtos,
        servicos: orcamento.servicos,
      });
      alert("Status atualizado com sucesso!");
      carregarOrcamento();
    } catch (error) {
      alert("Erro ao atualizar status");
    }
  };

  const handleConverterOS = async () => {
    if (!confirm("Deseja converter este orçamento em Ordem de Serviço?"))
      return;

    try {
      const response = await api.post(`/orcamentos/${id}/converter-os`);
      alert("Orçamento convertido em OS com sucesso!");
      navigate(`/ordens-servico/${response.data.id}`);
    } catch (error) {
      alert(
        "Erro ao converter orçamento: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!orcamento) {
    return <div className="text-center py-8">Orçamento não encontrado</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Orçamento {orcamento.numero}
        </h1>
        <div className="flex space-x-2">
          {orcamento.status === "Pendente" && (
            <>
              <button
                onClick={() => handleAtualizarStatus("Aprovado")}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Aprovar
              </button>
              <button
                onClick={() => handleAtualizarStatus("Reprovado")}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reprovar
              </button>
            </>
          )}
          {orcamento.status === "Aprovado" && (
            <button
              onClick={handleConverterOS}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Converter em OS
            </button>
          )}
          <Link
            to="/orcamentos"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Voltar
          </Link>
        </div>
      </div>

      {/* Informações do Orçamento */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <span className="text-sm text-gray-600">Status:</span>
            <p className="text-lg font-semibold">{orcamento.status}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Data:</span>
            <p className="text-lg font-semibold">
              {new Date(orcamento.criado_em).toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Valor Total:</span>
            <p className="text-2xl font-bold text-blue-600">
              R$ {orcamento.valor_total.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Cliente</h3>
            <p>
              <strong>Nome:</strong> {orcamento.cliente_nome}
            </p>
            <p>
              <strong>Telefone:</strong> {orcamento.cliente_telefone}
            </p>
            {orcamento.cliente_cpf_cnpj && (
              <p>
                <strong>CPF/CNPJ:</strong> {orcamento.cliente_cpf_cnpj}
              </p>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Veículo</h3>
            <p>
              <strong>Modelo:</strong> {orcamento.veiculo_modelo}
            </p>
            <p>
              <strong>Placa:</strong> {orcamento.veiculo_placa}
            </p>
            <p>
              <strong>Cor:</strong> {orcamento.veiculo_cor}
            </p>
            {orcamento.km && (
              <p>
                <strong>Km:</strong> {orcamento.km}
              </p>
            )}
          </div>
        </div>

        {orcamento.observacoes_veiculo && (
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-gray-800 mb-2">
              Observações do Veículo
            </h3>
            <p className="text-gray-700">{orcamento.observacoes_veiculo}</p>
          </div>
        )}
      </div>

      {/* Produtos */}
      {orcamento.produtos && orcamento.produtos.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Produtos</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                    Código
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                    Descrição
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                    Qtd
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                    Valor Unit.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orcamento.produtos.map((produto, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2 text-sm">{produto.codigo}</td>
                    <td className="px-4 py-2 text-sm">{produto.descricao}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      {produto.quantidade}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      R$ {produto.valor_unitario.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-semibold">
                      R$ {produto.valor_total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan="4" className="px-4 py-2 text-right">
                    Subtotal Produtos:
                  </td>
                  <td className="px-4 py-2 text-right">
                    R$ {orcamento.valor_produtos.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Serviços */}
      {orcamento.servicos && orcamento.servicos.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Serviços</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                    Código
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                    Descrição
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                    Qtd/Horas
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                    Valor Unit.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orcamento.servicos.map((servico, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2 text-sm">{servico.codigo}</td>
                    <td className="px-4 py-2 text-sm">{servico.descricao}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      {servico.quantidade}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      R$ {servico.valor_unitario.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-semibold">
                      R$ {servico.valor_total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan="4" className="px-4 py-2 text-right">
                    Subtotal Serviços:
                  </td>
                  <td className="px-4 py-2 text-right">
                    R$ {orcamento.valor_servicos.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Observações Gerais */}
      {orcamento.observacoes_gerais && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Observações Gerais
          </h2>
          <p className="text-gray-700">{orcamento.observacoes_gerais}</p>
        </div>
      )}
    </div>
  );
}
