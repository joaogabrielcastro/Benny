import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import OrcamentoImpressao from "../components/OrcamentoImpressao";
import PersonalizarImpressaoModal from "../components/PersonalizarImpressaoModal";
import {
  carregarDefaultsImpressao,
  salvarDefaultsImpressao,
} from "../utils/impressaoDefaults";
import { FiCheckCircle, FiEdit2, FiPrinter, FiMessageCircle, FiLink, FiXCircle } from "react-icons/fi";
import Section, { KeyValue } from "../components/ui/Section";
import StatusBadge from "../components/ui/StatusBadge";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import { useConfirm } from "../hooks/useConfirm";
import ConfirmDialog from "../components/ConfirmDialog";
import { formatarMoeda, formatarDataHora } from "../utils/formatters";

export default function OrcamentoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImpressaoModal, setShowImpressaoModal] = useState(false);
  const [textosImpressao, setTextosImpressao] = useState(() =>
    carregarDefaultsImpressao("orcamento"),
  );
  const impressaoRef = useRef();
  const pendingPrint = useRef(false);
  const { confirm, dialogState, handleClose } = useConfirm();

  useEffect(() => {
    carregarOrcamento();
  }, [id]);

  const carregarOrcamento = async () => {
    try {
      const response = await api.get(`/orcamentos/${id}`);
      setOrcamento(response.data);
      setLoading(false);
    } catch (error) {
      toast.error("Erro ao carregar orçamento");
      navigate("/orcamentos");
    }
  };

  const handleAtualizarStatus = async (novoStatus) => {
    if (novoStatus === "Aprovado") {
      const ok = await confirm({
        title: "Aprovar orçamento",
        message:
          "Será dada baixa no estoque e criada uma OS automaticamente. Continuar?",
        confirmLabel: "Aprovar",
      });
      if (!ok) return;
    }
    if (novoStatus === "Reprovado") {
      const ok = await confirm({
        title: "Reprovar orçamento",
        message: "Marcar este orçamento como reprovado pelo cliente? Nenhuma OS será criada.",
        confirmLabel: "Reprovar",
      });
      if (!ok) return;
    }

    try {
      const response = await api.put(`/orcamentos/${id}`, {
        status: novoStatus,
        cliente_id: orcamento.cliente_id,
        veiculo_id: orcamento.veiculo_id,
        km: orcamento.km,
        previsao_entrega: orcamento.previsao_entrega,
        observacoes_veiculo: orcamento.observacoes_veiculo,
        observacoes_gerais: orcamento.observacoes_gerais,
        responsavel_tecnico: orcamento.responsavel_tecnico,
        produtos: orcamento.produtos,
        servicos: orcamento.servicos,
      });
      if (novoStatus === "Aprovado" && response.data?.os?.id) {
        toast.success(
          `Orçamento aprovado. OS ${response.data.os.numero} criada.`,
        );
        navigate(`/ordens-servico/${response.data.os.id}`);
        return;
      }
      toast.success(response.data?.message || "Status atualizado com sucesso!");
      carregarOrcamento();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Erro ao atualizar status",
      );
    }
  };

  const handleCompartilhar = () => {
    const linkPublico = `${window.location.origin}/v/${orcamento.token_publico}`;
    navigator.clipboard.writeText(linkPublico);
    toast.success("Link copiado! Envie ao cliente para aprovação.");
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
    setShowImpressaoModal(true);
  };

  const handleConfirmarImpressao = (textos) => {
    salvarDefaultsImpressao("orcamento", textos);
    setTextosImpressao(textos);
    setShowImpressaoModal(false);
    pendingPrint.current = true;
  };

  useEffect(() => {
    if (pendingPrint.current && impressaoRef.current) {
      pendingPrint.current = false;
      setTimeout(() => impressaoRef.current.imprimir(), 150);
    }
  }, [textosImpressao]);

  if (loading) {
    return <LoadingSpinner size="xl" />;
  }

  if (!orcamento) {
    return (
      <div className="text-center py-8 text-slate-500">
        Orçamento não encontrado
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        back={{ to: "/orcamentos", label: "Orçamentos" }}
        eyebrow="Orçamento"
        title={<span className="num">{orcamento.numero}</span>}
        badge={<StatusBadge kind="orcamento" status={orcamento.status} />}
        subtitle={`${orcamento.cliente_nome} · ${orcamento.veiculo_placa || ""} · criado em ${formatarDataHora(orcamento.criado_em)}`}
        actions={
          <>
            {orcamento.status === "Pendente" && (
              <button type="button" onClick={() => handleAtualizarStatus("Aprovado")} className="btn-brand">
                <FiCheckCircle className="h-4 w-4" />
                Aprovar e abrir OS
              </button>
            )}
            {orcamento.status === "Pendente" && (
              <Link to={`/orcamentos/${id}/editar`} className="btn-secondary">
                <FiEdit2 className="h-4 w-4" />
                Editar
              </Link>
            )}
            <button type="button" onClick={handleImprimir} className="btn-secondary" title="Imprimir/Baixar PDF">
              <FiPrinter className="h-4 w-4" />
              Imprimir
            </button>
          </>
        }
      />

      {orcamento.status === "Pendente" && (
        <div className="pro-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900 dark:text-white">Enviar para aprovação do cliente</p>
            <p className="text-xs text-ink-500">O cliente abre o link, confere os itens e aprova ou reprova pelo celular.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {orcamento.cliente_telefone && (
              <button type="button" onClick={handleCompartilharWhatsApp} className="btn-secondary btn-sm" title="WhatsApp">
                <FiMessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </button>
            )}
            <button type="button" onClick={handleCompartilhar} className="btn-secondary btn-sm" title="Copiar link">
              <FiLink className="h-3.5 w-3.5" />
              Copiar link
            </button>
            <button type="button" onClick={() => handleAtualizarStatus("Reprovado")} className="btn-danger-soft btn-sm">
              <FiXCircle className="h-3.5 w-3.5" />
              Reprovar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Section title="Cliente">
          <dl className="space-y-2.5">
            <KeyValue label="Nome">
              {orcamento.cliente_id ? (
                <Link to={`/clientes/${orcamento.cliente_id}`} className="hover:text-brand-600">{orcamento.cliente_nome}</Link>
              ) : (
                orcamento.cliente_nome
              )}
            </KeyValue>
            <KeyValue label="Telefone">{orcamento.cliente_telefone}</KeyValue>
            {orcamento.cliente_cpf_cnpj && <KeyValue label="CPF/CNPJ">{orcamento.cliente_cpf_cnpj}</KeyValue>}
          </dl>
        </Section>
        <Section title="Veículo">
          <dl className="space-y-2.5">
            <KeyValue label="Modelo">
              {[orcamento.veiculo_marca, orcamento.veiculo_modelo, orcamento.veiculo_versao].filter(Boolean).join(" ") || null}
            </KeyValue>
            <div className="grid grid-cols-2 gap-3">
              <KeyValue label="Placa" mono>{orcamento.veiculo_placa}</KeyValue>
              <KeyValue label="Cor">{orcamento.veiculo_cor}</KeyValue>
            </div>
            {(orcamento.veiculo_motor || orcamento.veiculo_combustivel) && (
              <KeyValue label="Motor">{[orcamento.veiculo_motor, orcamento.veiculo_combustivel].filter(Boolean).join(" • ")}</KeyValue>
            )}
            {orcamento.km ? <KeyValue label="Km"><span className="num">{Number(orcamento.km).toLocaleString("pt-BR")}</span></KeyValue> : null}
          </dl>
        </Section>
        <Section title="Valores">
          <dl className="space-y-2">
            <div className="flex justify-between text-sm text-ink-600 dark:text-ink-300">
              <dt>Serviços</dt>
              <dd className="num">{formatarMoeda(orcamento.valor_servicos)}</dd>
            </div>
            <div className="flex justify-between text-sm text-ink-600 dark:text-ink-300">
              <dt>Peças</dt>
              <dd className="num">{formatarMoeda(orcamento.valor_produtos)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-ink-100 dark:border-ink-800 text-lg font-semibold text-ink-900 dark:text-white">
              <dt>Total</dt>
              <dd className="num">{formatarMoeda(orcamento.valor_total)}</dd>
            </div>
          </dl>
        </Section>
      </div>

      {orcamento.observacoes_veiculo && (
        <Section title="Relato do cliente / condição do veículo">
          <p className="text-sm text-ink-800 dark:text-ink-200 whitespace-pre-wrap">{orcamento.observacoes_veiculo}</p>
        </Section>
      )}

      {orcamento.produtos && orcamento.produtos.length > 0 && (
        <div className="pro-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Produtos
          </h2>
          <div className="overflow-x-auto">
            <table className="table-pro">
              <thead>
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

      {orcamento.servicos && orcamento.servicos.length > 0 && (
        <div className="pro-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Serviços
          </h2>
          <div className="overflow-x-auto">
            <table className="table-pro">
              <thead>
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

      {orcamento.observacoes_gerais && (
        <div className="pro-card p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Observações Gerais
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            {orcamento.observacoes_gerais}
          </p>
        </div>
      )}

      <OrcamentoImpressao
        ref={impressaoRef}
        orcamento={orcamento}
        textosImpressao={textosImpressao}
      />

      <PersonalizarImpressaoModal
        isOpen={showImpressaoModal}
        onClose={() => setShowImpressaoModal(false)}
        tipo="orcamento"
        onConfirmar={handleConfirmarImpressao}
      />

      <ConfirmDialog
        open={!!dialogState}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        cancelLabel={dialogState?.cancelLabel}
        onCancel={() => handleClose(false)}
        onConfirm={() => handleClose(true)}
      />
    </div>
  );
}
