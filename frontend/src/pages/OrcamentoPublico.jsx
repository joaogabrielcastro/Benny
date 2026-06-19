import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import OrcamentoImpressao from "../components/OrcamentoImpressao";

export default function OrcamentoPublico() {
  const { id } = useParams(); // id aqui é o token
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const impressaoRef = useRef();

  useEffect(() => {
    carregarOrcamento();
  }, [id]);

  // Página pública sempre em tema claro (legível para o cliente)
  useEffect(() => {
    document.documentElement.classList.remove("dark");

    return () => {
      const saved = localStorage.getItem("theme");
      const prefersDark =
        saved === "dark" ||
        (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  const carregarOrcamento = async () => {
    try {
      const response = await api.get(`/orcamentos/v/${id}`);
      setOrcamento(response.data);
      setLoading(false);
    } catch (error) {
      alert("Erro ao carregar orçamento");
      setLoading(false);
    }
  };

  const handleAprovar = async () => {
    if (!confirm("Confirma a aprovação deste orçamento?")) return;

    setEnviando(true);
    try {
      await api.put(`/orcamentos/v/${id}/aprovar`);
      alert("Orçamento aprovado com sucesso! Em breve entraremos em contato.");
      carregarOrcamento();
    } catch (error) {
      alert("Erro ao aprovar orçamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const handleReprovar = async () => {
    if (!confirm("Confirma a reprovação deste orçamento?")) return;

    setEnviando(true);
    try {
      await api.put(`/orcamentos/v/${id}/reprovar`);
      alert(
        "Orçamento reprovado. Entraremos em contato para mais informações.",
      );
      carregarOrcamento();
    } catch (error) {
      alert("Erro ao reprovar orçamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor) || 0);
  };

  const handleImprimir = () => {
    if (impressaoRef.current) {
      impressaoRef.current.imprimir();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Orçamento não encontrado
          </h1>
          <p className="text-gray-600">
            O link pode estar incorreto ou o orçamento foi removido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 text-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-xl p-6 sm:p-8 border-b-4 border-blue-600">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-700 mb-2">
              BENNY'S MOTORSPORT
            </h1>
            <p className="text-gray-600">
              Centro Automotivo • Excelência em Serviços
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Orçamento {orcamento.numero}
              </h2>
              <p className="text-gray-600 mt-1">
                Data:{" "}
                {new Date(orcamento.criado_em).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleImprimir}
                className="no-print px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-all flex items-center gap-2"
                title="Imprimir Orçamento"
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
              <span
                className={`px-6 py-3 rounded-full text-lg font-semibold ${
                  orcamento.status === "Aprovado"
                    ? "bg-green-100 text-green-800"
                    : orcamento.status === "Reprovado"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {orcamento.status}
              </span>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="bg-white shadow-xl p-6 sm:p-8 text-gray-900">
          {/* Cliente e Veículo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Dados do Cliente
              </h3>
              <div className="space-y-2 text-gray-900">
                <p>
                  <span className="font-semibold text-gray-700">Nome:</span>{" "}
                  {orcamento.cliente_nome || "—"}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Telefone:</span>{" "}
                  {orcamento.cliente_telefone || "—"}
                </p>
                {orcamento.cliente_cpf_cnpj && (
                  <p>
                    <span className="font-semibold text-gray-700">
                      CPF/CNPJ:
                    </span>{" "}
                    {orcamento.cliente_cpf_cnpj}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Dados do Veículo
              </h3>
              <div className="space-y-2 text-gray-900">
                <p>
                  <span className="font-semibold text-gray-700">Modelo:</span>{" "}
                  {[orcamento.veiculo_marca, orcamento.veiculo_modelo]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Placa:</span>{" "}
                  {orcamento.veiculo_placa || "—"}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Cor:</span>{" "}
                  {orcamento.veiculo_cor || "—"}
                </p>
                {orcamento.km != null && (
                  <p>
                    <span className="font-semibold text-gray-700">KM:</span>{" "}
                    {Number(orcamento.km).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Produtos */}
          {orcamento.produtos && orcamento.produtos.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
                Peças e Produtos
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-gray-900">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-800">
                        Qtd
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                        Valor Unit.
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {orcamento.produtos.map((produto, index) => (
                      <tr
                        key={index}
                        className="border-t border-gray-200 even:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-gray-900">
                          {produto.descricao}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900">
                          {produto.quantidade}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {formatarMoeda(produto.valor_unitario)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatarMoeda(produto.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Serviços */}
          {orcamento.servicos && orcamento.servicos.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
                Serviços
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-gray-900">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-800">
                        Qtd
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                        Valor Unit.
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {orcamento.servicos.map((servico, index) => (
                      <tr
                        key={index}
                        className="border-t border-gray-200 even:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-gray-900">
                          {servico.descricao}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900">
                          {servico.quantidade}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {formatarMoeda(servico.valor_unitario)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatarMoeda(servico.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Observações */}
          {orcamento.observacoes_gerais && (
            <div className="mb-8 bg-slate-50 border border-slate-200 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Observações
              </h3>
              <p className="text-gray-800 whitespace-pre-wrap">
                {orcamento.observacoes_gerais}
              </p>
            </div>
          )}

          {/* Totais */}
          <div className="bg-blue-50 border border-blue-200 p-6 sm:p-8 rounded-lg">
            <div className="flex justify-end items-center">
              <div className="text-right text-gray-900">
                <p className="text-lg mb-2">
                  Produtos:{" "}
                  <span className="font-semibold">
                    {formatarMoeda(orcamento.valor_produtos || 0)}
                  </span>
                </p>
                <p className="text-lg mb-4">
                  Serviços:{" "}
                  <span className="font-semibold">
                    {formatarMoeda(orcamento.valor_servicos || 0)}
                  </span>
                </p>
                <p className="text-2xl font-bold">
                  VALOR TOTAL:{" "}
                  <span className="text-blue-700">
                    {formatarMoeda(orcamento.valor_total || 0)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        {orcamento.status === "Pendente" && (
          <div className="bg-white rounded-b-2xl shadow-xl p-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleAprovar}
                disabled={enviando}
                className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {enviando ? "Enviando..." : "Aprovar Orçamento"}
              </button>
              <button
                onClick={handleReprovar}
                disabled={enviando}
                className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                {enviando ? "Enviando..." : "Reprovar Orçamento"}
              </button>
            </div>
            <p className="text-center text-gray-600 mt-4 text-sm">
              Ao aprovar, a oficina receberá sua confirmação e entrará em
              contato para agendar o serviço.
            </p>
          </div>
        )}

        {orcamento.status !== "Pendente" && (
          <div className="bg-white rounded-b-2xl shadow-xl p-8">
            <div className="text-center">
              <p className="text-xl text-gray-800">
                {orcamento.status === "Aprovado"
                  ? "✅ Orçamento já foi aprovado! Em breve entraremos em contato."
                  : "❌ Este orçamento foi reprovado. Entraremos em contato para mais informações."}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 no-print">
          <p className="text-sm">
            © 2026 Benny's Motorsport - Centro Automotivo
          </p>
          <p className="text-xs mt-2">
            Este é um link exclusivo para visualização e aprovação do orçamento.
          </p>
        </div>
      </div>

      {/* Componente de impressão (oculto) */}
      <OrcamentoImpressao ref={impressaoRef} orcamento={orcamento} />
    </div>
  );
}
