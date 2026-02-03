import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import OrcamentoImpressao from "../components/OrcamentoImpressao";

export default function OrcamentoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const impressaoRef = useRef();

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
          (error.response?.data?.error || error.message),
      );
    }
  };

  const handleCompartilhar = () => {
    const linkPublico = `${window.location.origin}/v/${orcamento.token_publico}`;
    navigator.clipboard.writeText(linkPublico);
    alert("Link copiado! Envie para o cliente aprovar o orçamento.");
  };

  const handleCompartilharWhatsApp = () => {
    const linkPublico = `${window.location.origin}/v/${orcamento.token_publico}`;
    const mensagem = `Olá! Segue o link para visualizar e aprovar o orçamento ${orcamento.numero}: ${linkPublico}`;
    const whatsappUrl = `https://wa.me/${orcamento.cliente_telefone?.replace(
      /\D/g,
      "",
    )}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleImprimir = () => {
    if (impressaoRef.current) {
      impressaoRef.current.imprimir();
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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Orçamento {orcamento.numero}
        </h1>
        <div className="flex space-x-2">
          {orcamento.status === "Pendente" && (
            <>
              <button
                onClick={handleImprimir}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                title="Imprimir/Baixar PDF"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Imprimir PDF
              </button>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Status:
            </span>
            <p className="text-lg font-semibold dark:text-white">
              {orcamento.status}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Data:
            </span>
            <p className="text-lg font-semibold dark:text-white">
              {new Date(orcamento.criado_em).toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Valor Total:
            </span>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              R$ {Number(orcamento.valor_total).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t dark:border-gray-700 pt-4">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
              Cliente
            </h3>
            <p className="dark:text-gray-300">
              <strong>Nome:</strong> {orcamento.cliente_nome}
            </p>
            <p className="dark:text-gray-300">
              <strong>Telefone:</strong> {orcamento.cliente_telefone}
            </p>
            {orcamento.cliente_cpf_cnpj && (
              <p className="dark:text-gray-300">
                <strong>CPF/CNPJ:</strong> {orcamento.cliente_cpf_cnpj}
              </p>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
              Veículo
            </h3>
            <p className="dark:text-gray-300">
              <strong>Modelo:</strong> {orcamento.veiculo_modelo}
            </p>
            <p className="dark:text-gray-300">
              <strong>Placa:</strong> {orcamento.veiculo_placa}
            </p>
            <p className="dark:text-gray-300">
              <strong>Cor:</strong> {orcamento.veiculo_cor}
            </p>
            {orcamento.km && (
              <p className="dark:text-gray-300">
                <strong>Km:</strong> {orcamento.km}
              </p>
            )}
          </div>
        </div>

        {orcamento.observacoes_veiculo && (
          <div className="border-t dark:border-gray-700 pt-4 mt-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
              Observações do Veículo
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              {orcamento.observacoes_veiculo}
            </p>
          </div>
        )}
      </div>

      {/* Produtos */}
      {orcamento.produtos && orcamento.produtos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Produtos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Código
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Descrição
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    Qtd
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    Valor Unit.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orcamento.produtos.map((produto, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="px-4 py-2 text-sm dark:text-gray-300">
                      {produto.codigo}
                    </td>
                    <td className="px-4 py-2 text-sm dark:text-gray-300">
                      {produto.descricao}
                    </td>
                    <td className="px-4 py-2 text-sm text-right dark:text-gray-300">
                      {produto.quantidade}
                    </td>
                    <td className="px-4 py-2 text-sm text-right dark:text-gray-300">
                      R$ {Number(produto.valor_unitario).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-semibold dark:text-gray-200">
                      R$ {Number(produto.valor_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                  <td
                    colSpan="4"
                    className="px-4 py-2 text-right dark:text-gray-300"
                  >
                    Subtotal Produtos:
                  </td>
                  <td className="px-4 py-2 text-right dark:text-gray-200">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Serviços
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Código
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                    Descrição
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    Qtd/Horas
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    Valor Unit.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orcamento.servicos.map((servico, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="px-4 py-2 text-sm dark:text-gray-300">
                      {servico.codigo}
                    </td>
                    <td className="px-4 py-2 text-sm dark:text-gray-300">
                      {servico.descricao}
                    </td>
                    <td className="px-4 py-2 text-sm text-right dark:text-gray-300">
                      {servico.quantidade}
                    </td>
                    <td className="px-4 py-2 text-sm text-right dark:text-gray-300">
                      R$ {Number(servico.valor_unitario).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-semibold dark:text-gray-200">
                      R$ {Number(servico.valor_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                  <td
                    colSpan="4"
                    className="px-4 py-2 text-right dark:text-gray-300"
                  >
                    Subtotal Serviços:
                  </td>
                  <td className="px-4 py-2 text-right dark:text-gray-200">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Observações Gerais
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {orcamento.observacoes_gerais}
          </p>
        </div>
      )}

      {/* Componente de impressão (oculto) */}
      <OrcamentoImpressao ref={impressaoRef} orcamento={orcamento} />
    </div>
  );
}
