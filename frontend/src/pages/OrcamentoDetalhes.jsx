import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import api from "../services/api";
import OrcamentoImpressao from "../components/OrcamentoImpressao";

export default function OrcamentoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const impressaoRef = useRef();

  const handleImprimir = useReactToPrint({
    content: () => impressaoRef.current,
    documentTitle: `Orcamento-${orcamento?.numero}`,
  });

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

  const handleCompartilhar = () => {
    const linkPublico = `${window.location.origin}/orcamento-publico/${id}`;
    navigator.clipboard.writeText(linkPublico);
    alert("Link copiado! Envie para o cliente aprovar o orçamento.");
  };

  const handleCompartilharWhatsApp = () => {
    const linkPublico = `${window.location.origin}/orcamento-publico/${id}`;
    const mensagem = `Olá! Segue o link para visualizar e aprovar o orçamento ${orcamento.numero}: ${linkPublico}`;
    const whatsappUrl = `https://wa.me/${orcamento.cliente_telefone?.replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, "_blank");
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
          <button
            onClick={handleImprimir}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            title="Imprimir Orçamento"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Imprimir
          </button>
          {orcamento.status === "Pendente" && (
            <>
              <button
                onClick={handleCompartilharWhatsApp}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
                title="Compartilhar via WhatsApp"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </button>
              <button
                onClick={handleCompartilhar}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                title="Copiar link para compartilhar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Compartilhar
              </button>
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
              R$ {Number(orcamento.valor_total).toFixed(2)}
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
                      R$ {Number(produto.valor_unitario).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-semibold">
                      R$ {Number(produto.valor_total).toFixed(2)}
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
                    R$ {Number(orcamento.valor_produtos).toFixed(2)}
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
                      R$ {Number(servico.valor_unitario).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-semibold">
                      R$ {Number(servico.valor_total).toFixed(2)}
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
                    R$ {Number(orcamento.valor_servicos).toFixed(2)}
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

      {/* Componente de impressão (oculto) */}
      <OrcamentoImpressao ref={impressaoRef} orcamento={orcamento} />
    </div>
  );
}
