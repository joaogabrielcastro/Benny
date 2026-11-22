import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FiPlay,
  FiCheckCircle,
  FiPrinter,
  FiEdit2,
  FiMoreHorizontal,
  FiXCircle,
  FiTrash2,
  FiUser,
  FiTruck,
  FiPhone,
  FiMessageCircle,
  FiList,
  FiFileText,
  FiAlertCircle,
  FiExternalLink,
} from "react-icons/fi";
import api from "../services/api";
import { useFiscalFeatures } from "../hooks/os/useFiscalFeatures";
import { useOrdemServicoQuery } from "../hooks/os/useOrdemServicoQuery";
import { useNotasFiscaisOs } from "../hooks/os/useNotasFiscaisOs";
import OSImpressao from "../components/OSImpressao";
import PersonalizarImpressaoModal from "../components/PersonalizarImpressaoModal";
import { carregarDefaultsImpressao, salvarDefaultsImpressao } from "../utils/impressaoDefaults";
import { useAuth } from "../contexts/AuthContext";
import ClienteEnderecoNfseBlock from "../features/os/ClienteEnderecoNfseBlock";
import NotaFiscalModal from "../features/os/NotaFiscalModal";
import ClienteFormModal from "../components/ClienteFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import { nfErroEnderecoTomador } from "../features/os/fiscalUtils";
import { mascaraCEP } from "../utils/masks";
import { formatarMoeda, formatarDataHora, formatarData } from "../utils/formatters";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import Section, { KeyValue } from "../components/ui/Section";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import OSStepper from "../features/os/OSStepper";
import OSFiscalPanel from "../features/os/OSFiscalPanel";
import OSPagamentos, { usePagamentosOs } from "../features/os/OSPagamentos";
import OSHistorico from "../features/os/OSHistorico";
import { formatarPlaca, rotuloVeiculoSemPlaca } from "../features/os/osHelpers";

const EDITAVEL = new Set(["Aberta", "Em andamento"]);

function whatsappUrl(telefone) {
  const d = String(telefone || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}

function MenuMais({ itens }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const fn = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false);
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [aberto]);
  const visiveis = itens.filter(Boolean);
  if (!visiveis.length) return null;
  return (
    <div className="relative !flex-none" ref={ref}>
      <button
        type="button"
        className="btn-secondary btn-icon"
        onClick={() => setAberto((v) => !v)}
        aria-label="Mais ações"
        aria-expanded={aberto}
      >
        <FiMoreHorizontal className="h-4 w-4" />
      </button>
      {aberto && (
        <div className="absolute right-0 top-full mt-1.5 w-56 pro-card shadow-pop z-30 p-1 animate-fade-in">
          {visiveis.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                setAberto(false);
                it.onClick();
              }}
              className={`w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left ${
                it.danger
                  ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  : "text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800"
              }`}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CancelarNotaDialog({ modelo, onClose, onConfirmar }) {
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";
  const [motivo, setMotivo] = useState("Cancelamento solicitado pelo emitente conforme acordo com o cliente.");
  const [enviando, setEnviando] = useState(false);
  const valido = motivo.trim().length >= 15;
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Cancelar ${label}`}
      description="O cancelamento é enviado ao provedor fiscal e não pode ser desfeito."
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Voltar
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={!valido || enviando}
            onClick={async () => {
              setEnviando(true);
              const ok = await onConfirmar(motivo.trim());
              setEnviando(false);
              if (ok) onClose();
            }}
          >
            {enviando ? "Enviando…" : `Cancelar ${label}`}
          </button>
        </>
      }
    >
      <label className="label-pro" htmlFor="motivo-canc">Motivo (mínimo 15 caracteres)</label>
      <textarea
        id="motivo-canc"
        className="input-pro min-h-[96px]"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <p className={`help-pro ${valido ? "" : "text-red-600"}`}>{motivo.trim().length}/15 caracteres</p>
    </Modal>
  );
}

function ItensOS({ os, isAdmin, onSalvarNcm }) {
  const produtos = os.produtos || [];
  const servicos = os.servicos || [];
  if (!produtos.length && !servicos.length) {
    return (
      <Section title="Serviços e peças" icon={FiList}>
        <EmptyState compact title="Nenhum item nesta OS" description="Use Editar para incluir serviços e peças." />
      </Section>
    );
  }
  return (
    <Section title="Serviços e peças" icon={FiList} padded={false}>
      {servicos.length > 0 && (
        <div>
          <p className="eyebrow px-4 sm:px-5 pt-4 pb-2">Serviços · mão de obra</p>
          <table className="table-pro">
            <thead className="hidden sm:table-header-group">
              <tr>
                <th>Descrição</th>
                <th className="text-right w-20">Qtd</th>
                <th className="text-right w-32">Unitário</th>
                <th className="text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s, i) => (
                <tr key={s.id || i}>
                  <td>
                    <p className="font-medium text-ink-900 dark:text-ink-100">{s.descricao}</p>
                    <p className="text-2xs text-ink-500">
                      {s.codigo}
                      <span className="sm:hidden num"> · {Number(s.quantidade)} × {formatarMoeda(s.valor_unitario)}</span>
                    </p>
                  </td>
                  <td className="text-right num hidden sm:table-cell">{Number(s.quantidade)}</td>
                  <td className="text-right num hidden sm:table-cell">{formatarMoeda(s.valor_unitario)}</td>
                  <td className="text-right num font-semibold text-ink-900 dark:text-ink-100">{formatarMoeda(s.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {produtos.length > 0 && (
        <div className={servicos.length ? "border-t border-ink-100 dark:border-ink-800" : ""}>
          <p className="eyebrow px-4 sm:px-5 pt-4 pb-2">Peças</p>
          <table className="table-pro">
            <thead className="hidden sm:table-header-group">
              <tr>
                <th>Descrição</th>
                {isAdmin && <th className="w-32">NCM</th>}
                <th className="text-right w-20">Qtd</th>
                <th className="text-right w-32">Unitário</th>
                <th className="text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const ncm = p.ncm || p.produto_ncm || "";
                return (
                  <tr key={p.id || i}>
                    <td>
                      <p className="font-medium text-ink-900 dark:text-ink-100">{p.descricao}</p>
                      <p className="text-2xs text-ink-500">
                        {p.codigo}
                        <span className="sm:hidden num"> · {p.quantidade} × {formatarMoeda(p.valor_unitario)}</span>
                      </p>
                      {isAdmin && (
                        <input
                          type="text"
                          inputMode="numeric"
                          defaultValue={ncm}
                          key={`m-${p.id}-${ncm}`}
                          onBlur={(e) => onSalvarNcm(p, e.target.value.replace(/\D/g, "").slice(0, 8))}
                          placeholder="NCM (8 dígitos)"
                          aria-label={`NCM de ${p.descricao}`}
                          className="sm:hidden input-pro !min-h-0 !py-1 !text-xs mt-1.5 w-40 font-mono"
                        />
                      )}
                    </td>
                    {isAdmin && (
                      <td className="hidden sm:table-cell">
                        <input
                          type="text"
                          inputMode="numeric"
                          defaultValue={ncm}
                          key={`${p.id}-${ncm}`}
                          onBlur={(e) => onSalvarNcm(p, e.target.value.replace(/\D/g, "").slice(0, 8))}
                          placeholder="8 dígitos"
                          title="Obrigatório para a NF-e autorizar"
                          aria-label={`NCM de ${p.descricao}`}
                          className={`input-pro !min-h-0 !py-1 !text-xs w-28 font-mono ${ncm ? "" : "!border-amber-300 dark:!border-amber-700"}`}
                        />
                      </td>
                    )}
                    <td className="text-right num hidden sm:table-cell">{p.quantidade}</td>
                    <td className="text-right num hidden sm:table-cell">{formatarMoeda(p.valor_unitario)}</td>
                    <td className="text-right num font-semibold text-ink-900 dark:text-ink-100">{formatarMoeda(p.valor_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <dl className="border-t border-ink-200 dark:border-ink-700 px-4 sm:px-5 py-3 space-y-1 text-sm bg-ink-50/60 dark:bg-ink-850/40 rounded-b-xl">
        <div className="flex justify-between text-ink-600 dark:text-ink-300">
          <dt>Serviços</dt>
          <dd className="num">{formatarMoeda(os.valor_servicos)}</dd>
        </div>
        <div className="flex justify-between text-ink-600 dark:text-ink-300">
          <dt>Peças</dt>
          <dd className="num">{formatarMoeda(os.valor_produtos)}</dd>
        </div>
        <div className="flex justify-between pt-1 text-base font-semibold text-ink-900 dark:text-white">
          <dt>Total</dt>
          <dd className="num">{formatarMoeda(os.valor_total)}</dd>
        </div>
      </dl>
    </Section>
  );
}

function ResponsavelSelect({ os, onSalvo }) {
  const { data: usuarios = [] } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: async () => (await api.get("/responsaveis")).data,
    staleTime: 5 * 60_000,
  });
  const [salvando, setSalvando] = useState(false);
  const atualId = os.responsavel_usuario_id ? String(os.responsavel_usuario_id) : "";
  const textoLivreSemVinculo = !atualId && os.responsavel_tecnico;

  const salvar = async (valor) => {
    setSalvando(true);
    try {
      await api.put(`/ordens-servico/${os.id}`, {
        responsavel_usuario_id: valor ? Number(valor) : null,
        ...(valor ? {} : { responsavel_tecnico: null }),
      });
      toast.success("Responsável atualizado.");
      onSalvo();
    } catch (error) {
      toast.error(error.response?.data?.error || "Não foi possível atualizar o responsável.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <label className="text-xs text-ink-500" htmlFor="resp">Responsável</label>
      <select
        id="resp"
        className="input-pro mt-0.5 !min-h-[2.25rem]"
        value={atualId}
        disabled={salvando || os.status === "Cancelada"}
        onChange={(e) => salvar(e.target.value)}
      >
        <option value="">{textoLivreSemVinculo ? `${os.responsavel_tecnico} (texto livre)` : "Não atribuído"}</option>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
            {u.role === "mecanico" ? " · mecânico" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function OSDetalhes() {
  const { isAdmin } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editarClienteAberto, setEditarClienteAberto] = useState(false);
  const [showImpressaoModal, setShowImpressaoModal] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);
  const [cancelarNota, setCancelarNota] = useState(null);
  const [mudandoStatus, setMudandoStatus] = useState(false);
  const [mostrarEndereco, setMostrarEndereco] = useState(false);
  const [textosImpressao, setTextosImpressao] = useState(() => carregarDefaultsImpressao("os"));
  const { nfeHabilitada, nfseIncluirPecas } = useFiscalFeatures();
  const {
    os,
    loading,
    notaFiscalServico,
    setNotaFiscalServico,
    notaFiscalPecas,
    setNotaFiscalPecas,
    carregar: carregarOS,
  } = useOrdemServicoQuery(id);
  const { data: pagamentosData } = usePagamentosOs(id, isAdmin);

  const recarregar = () => {
    carregarOS();
    qc.invalidateQueries({ queryKey: ["ordens-servico"] });
  };

  const nf = useNotasFiscaisOs({
    osId: id,
    os,
    loading,
    notaFiscalServico,
    setNotaFiscalServico,
    notaFiscalPecas,
    setNotaFiscalPecas,
    carregarOS,
    nfeHabilitada,
    nfseIncluirPecas,
    onCadastroClienteIncompleto: () => setEditarClienteAberto(true),
    onOperacaoFiscalIncompleta: () => navigate(`/ordens-servico/${id}/editar`),
  });

  const componentRef = useRef();

  const salvarNcmProduto = async (produto, digitos) => {
    if (digitos && digitos.length !== 8) {
      toast.error("NCM precisa ter 8 dígitos");
      return;
    }
    const gravado = String(produto.ncm || "").replace(/\D/g, "");
    if (digitos === gravado) return;
    try {
      await api.put(`/ordens-servico/${id}`, {
        status: os.status,
        responsavel_tecnico: os.responsavel_tecnico,
        km: os.km ?? null,
        previsao_entrega: os.previsao_entrega,
        observacoes_veiculo: os.observacoes_veiculo,
        observacoes_gerais: os.observacoes_gerais,
        consumidor_final: os.consumidor_final,
        produtos: os.produtos.map((p) => ({
          id: p.id,
          produto_id: p.produto_id || null,
          codigo: p.codigo || "",
          descricao: p.descricao,
          quantidade: p.quantidade,
          valor_unitario: p.valor_unitario,
          valor_total: p.valor_total,
          ncm: p.id === produto.id ? digitos : p.ncm || "",
        })),
      });
      toast.success("NCM salvo");
      carregarOS();
    } catch (error) {
      toast.error(error.response?.data?.error || "Não foi possível salvar o NCM");
    }
  };

  const atualizarStatus = async (novoStatus) => {
    setMudandoStatus(true);
    try {
      await api.put(`/ordens-servico/${id}`, { status: novoStatus });
      const msg = {
        "Em andamento": "Serviço iniciado.",
        Finalizada: "OS finalizada.",
        Cancelada: "OS cancelada. Peças devolvidas ao estoque.",
      };
      toast.success(msg[novoStatus] || "Status atualizado.");
      recarregar();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao atualizar status");
    } finally {
      setMudandoStatus(false);
    }
  };

  const excluirOs = async () => {
    try {
      await api.delete(`/ordens-servico/${id}`);
      toast.success("Ordem de serviço excluída.");
      qc.invalidateQueries({ queryKey: ["ordens-servico"] });
      navigate("/ordens-servico");
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao excluir OS");
    }
  };

  const handleImprimir = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `OS_${os?.numero}`,
    pageStyle: `
      @page { size: A4; margin: 0.8cm; }
      @media print {
        html, body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        img.logo-impressao, .logo-impressao {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          filter: none !important;
        }
      }
    `,
  });

  const handleConfirmarImpressao = (textos) => {
    salvarDefaultsImpressao("os", textos);
    setTextosImpressao(textos);
    setShowImpressaoModal(false);
    setTimeout(() => handleImprimir(), 150);
  };

  const motivoEnderecoNf = useMemo(() => {
    const cepOk = String(os?.cliente_cep || "").replace(/\D/g, "").length === 8;
    const nfRejeitada =
      (nf.notaFiscalServico?.status_nf === "rejeitada" && nfErroEnderecoTomador(nf.notaFiscalServico)) ||
      (nfeHabilitada && nf.notaFiscalPecas?.status_nf === "rejeitada" && nfErroEnderecoTomador(nf.notaFiscalPecas));
    if (nfRejeitada) return "cep_invalido";
    if (!cepOk) return "cep_ausente";
    return null;
  }, [os?.cliente_cep, nf.notaFiscalServico, nf.notaFiscalPecas, nfeHabilitada]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!os) {
    return (
      <EmptyState
        icon={FiAlertCircle}
        title="OS não encontrada"
        action={<Link to="/ordens-servico" className="btn-secondary">Voltar para a lista</Link>}
      />
    );
  }

  const editavel = EDITAVEL.has(os.status);
  const situacao = pagamentosData?.resumo?.situacao;
  const notaAutorizada =
    nf.notaFiscalServico?.status_nf === "autorizada" || nf.notaFiscalPecas?.status_nf === "autorizada";
  const wa = whatsappUrl(os.cliente_telefone);

  const acaoPrincipal =
    os.status === "Aberta" ? (
      <button type="button" className="btn-brand" disabled={mudandoStatus} onClick={() => atualizarStatus("Em andamento")}>
        <FiPlay className="h-4 w-4" />
        Iniciar serviço
      </button>
    ) : os.status === "Em andamento" ? (
      <button
        type="button"
        className="btn-success"
        disabled={mudandoStatus}
        onClick={() =>
          setConfirmacao({
            title: "Finalizar ordem de serviço",
            message:
              "Confirme que o serviço foi concluído. Depois de finalizada, a OS não aceita mais alteração de itens e fica liberada para pagamento e nota fiscal.",
            confirmLabel: "Finalizar",
            variant: "primary",
            onConfirm: () => atualizarStatus("Finalizada"),
          })
        }
      >
        <FiCheckCircle className="h-4 w-4" />
        Finalizar serviço
      </button>
    ) : null;

  return (
    <div className="page-enter">
      <PageHeader
        back={{ to: "/ordens-servico", label: "Ordens de serviço" }}
        eyebrow="Ordem de serviço"
        title={<span className="num">{os.numero}</span>}
        badge={<StatusBadge kind="os" status={os.status} />}
        subtitle={
          <>
            {os.cliente_nome} · <span className="font-mono">{formatarPlaca(os.veiculo_placa)}</span> · aberta em{" "}
            {formatarDataHora(os.criado_em)}
            {os.finalizado_em ? ` · finalizada em ${formatarDataHora(os.finalizado_em)}` : ""}
          </>
        }
        actions={
          <>
            {acaoPrincipal}
            {editavel && (
              <Link to={`/ordens-servico/${id}/editar`} className="btn-secondary">
                <FiEdit2 className="h-4 w-4" />
                Editar
              </Link>
            )}
            <button type="button" className="btn-secondary" onClick={() => setShowImpressaoModal(true)}>
              <FiPrinter className="h-4 w-4" />
              Imprimir
            </button>
            <MenuMais
              itens={[
                editavel && {
                  label: "Cancelar OS",
                  icon: FiXCircle,
                  danger: true,
                  onClick: () =>
                    setConfirmacao({
                      title: "Cancelar ordem de serviço",
                      message: `Cancelar a ${os.numero}? As peças desta OS voltam para o estoque. Esta ação não pode ser desfeita.`,
                      confirmLabel: "Cancelar OS",
                      onConfirm: () => atualizarStatus("Cancelada"),
                    }),
                },
                isAdmin && {
                  label: "Excluir OS",
                  icon: FiTrash2,
                  danger: true,
                  onClick: () =>
                    setConfirmacao({
                      title: "Excluir ordem de serviço",
                      message: `Excluir a ${os.numero}? Movimentações de estoque desta OS serão desfeitas.`,
                      confirmLabel: "Excluir",
                      onConfirm: excluirOs,
                    }),
                },
              ]}
            />
          </>
        }
      />

      <div className="pro-card px-3 sm:px-5 pt-4 pb-3 mb-5">
        <OSStepper os={os} situacaoPagamento={situacao} notaAutorizada={notaAutorizada} mostrarFinanceiro={isAdmin} />
      </div>

      {isAdmin && motivoEnderecoNf && !mostrarEndereco && motivoEnderecoNf !== "cep_invalido" && (
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <FiAlertCircle className="h-4 w-4 text-amber-600 shrink-0 hidden sm:block" />
          <p className="flex-1 text-sm text-amber-900 dark:text-amber-200">
            <span className="font-semibold">Endereço do cliente incompleto.</span> O CEP é obrigatório para emitir a NFS-e.
          </p>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setMostrarEndereco(true)}>
            Completar endereço
          </button>
        </div>
      )}

      {isAdmin && motivoEnderecoNf && (mostrarEndereco || motivoEnderecoNf === "cep_invalido") && (
        <div className="mb-5">
          <ClienteEnderecoNfseBlock
            os={os}
            motivo={motivoEnderecoNf}
            rejeicaoKey={[
              nf.notaFiscalServico?.id,
              nf.notaFiscalServico?.atualizado_em_nf,
              nf.notaFiscalServico?.detalhe_rejeicao,
              nf.notaFiscalPecas?.id,
              nf.notaFiscalPecas?.atualizado_em_nf,
            ].join("-")}
            onSalvo={carregarOS}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <Section title="Relato e diagnóstico" icon={FiFileText}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ink-500">Relato do cliente / condição do veículo</p>
                <p className="mt-1 text-sm text-ink-900 dark:text-ink-100 whitespace-pre-wrap">
                  {os.observacoes_veiculo || <span className="text-ink-400">Não informado</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-500">Diagnóstico e observações</p>
                <p className="mt-1 text-sm text-ink-900 dark:text-ink-100 whitespace-pre-wrap">
                  {os.observacoes_gerais || <span className="text-ink-400">Não informado</span>}
                </p>
              </div>
            </div>
          </Section>

          <ItensOS os={os} isAdmin={isAdmin} onSalvarNcm={salvarNcmProduto} />

          {isAdmin && <OSHistorico os={os} />}
        </div>

        <aside className="space-y-5 min-w-0">
          {isAdmin && <OSPagamentos os={os} />}

          <Section title="Atendimento" icon={FiList}>
            <dl className="grid grid-cols-2 gap-4">
              <KeyValue label="Quilometragem">
                {os.km != null && os.km !== "" ? <span className="num">{Number(os.km).toLocaleString("pt-BR")} km</span> : null}
              </KeyValue>
              <KeyValue label="Previsão de entrega">{os.previsao_entrega ? formatarData(os.previsao_entrega) : null}</KeyValue>
              <div className="col-span-2">
                {isAdmin ? (
                  <ResponsavelSelect os={os} onSalvo={recarregar} />
                ) : (
                  <KeyValue label="Responsável">{os.responsavel_tecnico}</KeyValue>
                )}
              </div>
            </dl>
          </Section>

          <Section
            title="Cliente"
            icon={FiUser}
            actions={
              isAdmin && os.cliente_id ? (
                <button type="button" onClick={() => setEditarClienteAberto(true)} className="text-xs link-pro">
                  Editar
                </button>
              ) : null
            }
          >
            <p className="text-sm font-semibold text-ink-900 dark:text-white">{os.cliente_nome}</p>
            {os.cliente_cpf_cnpj && <p className="text-xs text-ink-500 num">{os.cliente_cpf_cnpj}</p>}
            {os.cliente_telefone && (
              <div className="mt-3 flex gap-2">
                <a href={`tel:${String(os.cliente_telefone).replace(/\D/g, "")}`} className="btn-secondary btn-sm flex-1">
                  <FiPhone className="h-3.5 w-3.5" />
                  {os.cliente_telefone}
                </a>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="btn-secondary btn-sm" title="Abrir WhatsApp">
                    <FiMessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>
            )}
            {(os.cliente_endereco || os.cliente_cep) && (
              <p className="mt-3 text-xs text-ink-500">
                {[os.cliente_endereco, os.cliente_numero, os.cliente_bairro, os.cliente_cidade, os.cliente_estado]
                  .filter(Boolean)
                  .join(", ")}
                {os.cliente_cep && ` · CEP ${mascaraCEP(os.cliente_cep)}`}
              </p>
            )}
            {isAdmin && os.cliente_id && (
              <Link to={`/clientes/${os.cliente_id}`} className="mt-3 text-xs link-pro inline-flex items-center gap-1">
                Ficha e histórico do cliente <FiExternalLink className="h-3 w-3" />
              </Link>
            )}
          </Section>

          <Section title="Veículo" icon={FiTruck}>
            <div className="flex items-center gap-3">
              <span className="rounded-md border-2 border-ink-800 dark:border-ink-300 px-2 py-0.5 font-mono text-sm font-bold tracking-wider text-ink-900 dark:text-white bg-white dark:bg-ink-900">
                {formatarPlaca(os.veiculo_placa)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">{rotuloVeiculoSemPlaca(os)}</p>
                <p className="text-xs text-ink-500">
                  {[os.veiculo_ano, os.veiculo_cor, os.veiculo_combustivel].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              {os.veiculo_motor && <KeyValue label="Motor">{os.veiculo_motor}</KeyValue>}
              {os.veiculo_chassi && (
                <KeyValue label="Chassi" mono className="col-span-2">
                  {os.veiculo_chassi}
                </KeyValue>
              )}
            </dl>
            {isAdmin && os.cliente_id && (
              <Link
                to={`/clientes/${os.cliente_id}?veiculo=${os.veiculo_id}`}
                className="mt-3 text-xs link-pro inline-flex items-center gap-1"
              >
                Histórico deste veículo <FiExternalLink className="h-3 w-3" />
              </Link>
            )}
          </Section>

          {isAdmin && (
            <OSFiscalPanel
              os={os}
              notaFiscalServico={nf.notaFiscalServico}
              notaFiscalPecas={nf.notaFiscalPecas}
              gerandoNfse={nf.gerandoNfse}
              gerandoNfe={nf.gerandoNfe}
              onGerarNF={nf.handleGerarNF}
              onShowNFModal={nf.setShowNFModal}
              nfeHabilitada={nfeHabilitada}
              nfseIncluirPecas={nfseIncluirPecas}
            />
          )}
        </aside>
      </div>

      <OSImpressao ref={componentRef} os={os} textosImpressao={textosImpressao} />

      <PersonalizarImpressaoModal
        isOpen={showImpressaoModal}
        onClose={() => setShowImpressaoModal(false)}
        tipo="os"
        onConfirmar={handleConfirmarImpressao}
      />

      <ConfirmDialog
        open={!!confirmacao}
        title={confirmacao?.title}
        message={confirmacao?.message}
        confirmLabel={confirmacao?.confirmLabel}
        cancelLabel="Voltar"
        variant={confirmacao?.variant || "danger"}
        onCancel={() => setConfirmacao(null)}
        onConfirm={() => {
          const fn = confirmacao?.onConfirm;
          setConfirmacao(null);
          fn?.();
        }}
      />

      {isAdmin && (
        <NotaFiscalModal
          isOpen={!!nf.showNFModal}
          modelo={nf.showNFModal}
          nota={nf.notaFiscalModal}
          os={os}
          onClose={() => nf.setShowNFModal(null)}
          onCancelar={() => {
            const modelo = nf.showNFModal;
            nf.setShowNFModal(null);
            setCancelarNota(modelo);
          }}
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

      {cancelarNota && (
        <CancelarNotaDialog
          modelo={cancelarNota}
          onClose={() => setCancelarNota(null)}
          onConfirmar={(motivo) => nf.handleCancelarNF(cancelarNota, motivo)}
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
