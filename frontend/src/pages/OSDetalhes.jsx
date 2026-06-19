import { useRef, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import api from "../services/api";
import { useOrdemServicoQuery } from "../hooks/os/useOrdemServicoQuery";
import { useNotasFiscaisOs } from "../hooks/os/useNotasFiscaisOs";
import OSImpressao from "../components/OSImpressao";
import PersonalizarImpressaoModal from "../components/PersonalizarImpressaoModal";
import {
  carregarDefaultsImpressao,
  salvarDefaultsImpressao,
} from "../utils/impressaoDefaults";
import OSDetalhesAcoes from "../features/os/OSDetalhesAcoes";
import { useAuth } from "../contexts/AuthContext";
import ClienteEnderecoNfseBlock from "../features/os/ClienteEnderecoNfseBlock";
import NotaFiscalModal from "../features/os/NotaFiscalModal";
import ClienteFormModal from "../components/ClienteFormModal";
import { nfErroEnderecoTomador } from "../features/os/fiscalUtils";
import { mascaraCEP } from "../utils/masks";
import { formatarMoeda, formatarDataHora } from "../utils/formatters";
import { osStatusClass } from "../utils/statusColors";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";

export default function OSDetalhes() {
  const { isAdmin } = useAuth();
  const { id } = useParams();
  const [editarClienteAberto, setEditarClienteAberto] = useState(false);
  const [showImpressaoModal, setShowImpressaoModal] = useState(false);
  const [textosImpressao, setTextosImpressao] = useState(() =>
    carregarDefaultsImpressao("os"),
  );
  const {
    os,
    loading,
    notaFiscalServico,
    setNotaFiscalServico,
    notaFiscalPecas,
    setNotaFiscalPecas,
    carregar: carregarOS,
  } = useOrdemServicoQuery(id);

  const nf = useNotasFiscaisOs({
    osId: id,
    os,
    loading,
    notaFiscalServico,
    setNotaFiscalServico,
    notaFiscalPecas,
    setNotaFiscalPecas,
    carregarOS,
  });

  const componentRef = useRef();

  const handleAtualizarStatus = async (novoStatus) => {
    try {
      await api.put(`/ordens-servico/${id}`, {
        status: novoStatus,
        responsavel_tecnico: os.responsavel_tecnico,
      });
      toast.success("Status atualizado com sucesso!");
      carregarOS();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleImprimir = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `OS_${os?.numero}`,
  });

  const handleAbrirImpressao = () => {
    setShowImpressaoModal(true);
  };

  const handleConfirmarImpressao = (textos) => {
    salvarDefaultsImpressao("os", textos);
    setTextosImpressao(textos);
    setShowImpressaoModal(false);
    setTimeout(() => handleImprimir(), 150);
  };

  const motivoEnderecoNf = useMemo(() => {
    const cepOk =
      String(os?.cliente_cep || "").replace(/\D/g, "").length === 8;
    const nfRejeitada =
      (nf.notaFiscalServico?.status_nf === "rejeitada" &&
        nfErroEnderecoTomador(nf.notaFiscalServico)) ||
      (nf.notaFiscalPecas?.status_nf === "rejeitada" &&
        nfErroEnderecoTomador(nf.notaFiscalPecas));
    if (nfRejeitada) return "cep_invalido";
    if (!cepOk) return "cep_ausente";
    return null;
  }, [os?.cliente_cep, nf.notaFiscalServico, nf.notaFiscalPecas]);

  if (loading) {
    return <LoadingSpinner size="xl" />;
  }

  if (!os) {
    return (
      <div className="text-center py-8 text-slate-500">OS não encontrada</div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={`OS ${os.numero}`}
        subtitle={`Cliente: ${os.cliente_nome} · ${os.veiculo_placa || ""}`}
        badge={
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${osStatusClass(os.status)}`}
          >
            {os.status}
          </span>
        }
      />

      <OSDetalhesAcoes
        os={os}
        osId={id}
        notaFiscalServico={nf.notaFiscalServico}
        notaFiscalPecas={nf.notaFiscalPecas}
        gerandoNfse={nf.gerandoNfse}
        gerandoNfe={nf.gerandoNfe}
        onGerarNF={nf.handleGerarNF}
        onShowNFModal={nf.setShowNFModal}
        onAtualizarStatus={handleAtualizarStatus}
        onImprimir={handleAbrirImpressao}
        isAdmin={isAdmin}
      />

      {isAdmin && motivoEnderecoNf && (
        <ClienteEnderecoNfseBlock
          os={os}
          motivo={motivoEnderecoNf}
          onSalvo={carregarOS}
        />
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
        Aberta em {formatarDataHora(os.criado_em)}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pro-card p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Cliente
            </h2>
            {isAdmin && os.cliente_id && (
              <button
                type="button"
                onClick={() => setEditarClienteAberto(true)}
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
              >
                Editar
              </button>
            )}
          </div>
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
            {(os.cliente_endereco || os.cliente_cep) && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Endereço:
                </span>
                <p className="text-gray-800 dark:text-gray-200">
                  {[
                    os.cliente_endereco,
                    os.cliente_numero,
                    os.cliente_bairro,
                    os.cliente_cidade,
                    os.cliente_estado,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  {os.cliente_cep && (
                    <span className="block text-sm text-slate-500 mt-1">
                      CEP {mascaraCEP(os.cliente_cep)}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pro-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Veículo
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

      {os.produtos && os.produtos.length > 0 && (
        <div className="pro-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Produtos
          </h2>
          <div className="overflow-x-auto">
            <table className="table-pro">
              <thead>
                <tr>
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

      {os.servicos && os.servicos.length > 0 && (
        <div className="pro-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Serviços
          </h2>
          <div className="overflow-x-auto">
            <table className="table-pro">
              <thead>
                <tr>
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

      <div className="pro-card p-6 bg-brand-600 text-white border-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <span className="text-lg font-semibold">Valor total da OS</span>
          <span className="text-3xl font-bold tabular-nums">
            {formatarMoeda(os.valor_total)}
          </span>
        </div>
      </div>

      {os.observacoes_gerais && (
        <div className="pro-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Observações gerais
          </h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {os.observacoes_gerais}
          </p>
        </div>
      )}

      {os.responsavel_tecnico && (
        <div className="pro-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Responsável técnico
          </h2>
          <p className="text-lg text-gray-800 dark:text-gray-200">
            {os.responsavel_tecnico}
          </p>
        </div>
      )}

      <OSImpressao
        ref={componentRef}
        os={os}
        textosImpressao={textosImpressao}
      />

      <PersonalizarImpressaoModal
        isOpen={showImpressaoModal}
        onClose={() => setShowImpressaoModal(false)}
        tipo="os"
        onConfirmar={handleConfirmarImpressao}
      />

      {isAdmin && (
        <NotaFiscalModal
          isOpen={!!nf.showNFModal}
          modelo={nf.showNFModal}
          nota={nf.notaFiscalModal}
          os={os}
          onClose={() => nf.setShowNFModal(null)}
          onCancelar={() => nf.handleCancelarNF(nf.showNFModal)}
          onCorrigirEndereco={
            nf.notaFiscalModal &&
            nf.notaFiscalModal.status_nf === "rejeitada" &&
            nfErroEnderecoTomador(nf.notaFiscalModal)
              ? () => {
                  nf.setShowNFModal(null);
                  setEditarClienteAberto(true);
                }
              : undefined
          }
        />
      )}

      {isAdmin && (
        <ClienteFormModal
          isOpen={editarClienteAberto}
          onClose={() => setEditarClienteAberto(false)}
          clienteId={os.cliente_id}
          onSuccess={() => {
            carregarOS();
            setEditarClienteAberto(false);
          }}
        />
      )}
    </div>
  );
}
