import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiEdit2,
  FiPlus,
  FiPhone,
  FiMessageCircle,
  FiMail,
  FiMapPin,
  FiTruck,
  FiTool,
  FiAlertCircle,
  FiChevronRight,
} from "react-icons/fi";
import api from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import Section, { KeyValue } from "../components/ui/Section";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import StatCard from "../components/ui/StatCard";
import ClienteFormModal from "../components/ClienteFormModal";
import NovoVeiculoModal from "../components/NovoVeiculoModal";
import { unwrapListResponse, unwrapPagination } from "../utils/apiList";
import { formatarMoeda, formatarData } from "../utils/formatters";
import { mascaraCEP } from "../utils/masks";
import { formatarPlaca, tempoRelativo, situacaoPagamentoOs } from "../features/os/osHelpers";

function whatsappUrl(telefone) {
  const d = String(telefone || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}

const LIMITE_HISTORICO = 50;

export default function ClienteDetalhes() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const veiculoFiltro = searchParams.get("veiculo") || "";
  const [editarCliente, setEditarCliente] = useState(false);
  const [veiculoModal, setVeiculoModal] = useState(null); // {} novo | veiculo

  const { data: cliente, isLoading, isError } = useQuery({
    queryKey: ["clientes", "detalhe", id],
    queryFn: async () => (await api.get(`/clientes/${id}`)).data,
  });
  const { data: veiculos = [], refetch: recarregarVeiculos } = useQuery({
    queryKey: ["veiculos", "cliente", id],
    queryFn: async () => (await api.get(`/veiculos/cliente/${id}`)).data,
  });
  const { data: historico, isLoading: carregandoHist } = useQuery({
    queryKey: ["ordens-servico", { cliente_id: id, veiculo_id: veiculoFiltro, limit: LIMITE_HISTORICO }],
    queryFn: async () => {
      const { data } = await api.get("/ordens-servico", {
        params: {
          cliente_id: id,
          ...(veiculoFiltro ? { veiculo_id: veiculoFiltro } : {}),
          limit: LIMITE_HISTORICO,
          page: 1,
          ordenar: "criado_em",
          direcao: "desc",
        },
      });
      return { rows: unwrapListResponse(data), total: unwrapPagination(data)?.total ?? 0 };
    },
  });

  const ordens = historico?.rows ?? [];
  const resumo = useMemo(() => {
    const validas = ordens.filter((o) => o.status !== "Cancelada");
    const finalizadas = ordens.filter((o) => o.status === "Finalizada");
    return {
      visitas: validas.length,
      gasto: finalizadas.reduce((s, o) => s + Number(o.valor_total || 0), 0),
      emAberto: finalizadas.reduce((s, o) => s + Math.max(0, Number(o.valor_total || 0) - Number(o.valor_recebido || 0)), 0),
      ultima: ordens[0]?.criado_em,
      kmMax: Math.max(0, ...ordens.map((o) => Number(o.km || 0))),
    };
  }, [ordens]);

  if (isLoading) return <LoadingSpinner size="lg" />;
  if (isError || !cliente) {
    return (
      <EmptyState
        icon={FiAlertCircle}
        title="Cliente não encontrado"
        action={<Link to="/clientes" className="btn-secondary">Voltar para clientes</Link>}
      />
    );
  }

  const wa = whatsappUrl(cliente.telefone);
  const endereco = [cliente.endereco, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.estado]
    .filter(Boolean)
    .join(", ");
  const veiculoSel = veiculos.find((v) => String(v.id) === String(veiculoFiltro));
  const novoAtendimentoUrl = `/orcamentos/novo?cliente_id=${cliente.id}${veiculoSel ? `&veiculo_id=${veiculoSel.id}` : ""}`;

  const filtrarVeiculo = (vid) => {
    const next = new URLSearchParams(searchParams);
    if (!vid || String(vid) === String(veiculoFiltro)) next.delete("veiculo");
    else next.set("veiculo", vid);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="page-enter">
      <PageHeader
        back={{ to: "/clientes", label: "Clientes" }}
        eyebrow="Cliente"
        title={cliente.nome}
        subtitle={[cliente.cpf_cnpj, cliente.cidade && `${cliente.cidade}${cliente.estado ? `/${cliente.estado}` : ""}`].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditarCliente(true)}>
              <FiEdit2 className="h-4 w-4" />
              Editar
            </button>
            <Link to={novoAtendimentoUrl} className="btn-brand">
              <FiPlus className="h-4 w-4" />
              Novo atendimento
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Atendimentos" value={resumo.visitas} hint={veiculoSel ? `Veículo ${formatarPlaca(veiculoSel.placa)}` : "Todos os veículos"} icon={FiTool} accent="brand" loading={carregandoHist} />
        <StatCard label="Total em serviços" value={formatarMoeda(resumo.gasto)} hint="OS finalizadas" accent="green" loading={carregandoHist} />
        <StatCard label="Em aberto" value={formatarMoeda(resumo.emAberto)} hint="Saldo de OS finalizadas" accent={resumo.emAberto > 0 ? "amber" : "gray"} loading={carregandoHist} />
        <StatCard label="Última visita" value={resumo.ultima ? formatarData(resumo.ultima) : "—"} hint={resumo.ultima ? tempoRelativo(resumo.ultima) : "Sem atendimentos"} accent="gray" loading={carregandoHist} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <Section title="Contato" icon={FiPhone}>
            <dl className="space-y-3">
              <KeyValue label="Telefone">{cliente.telefone}</KeyValue>
              {cliente.email && (
                <KeyValue label="E-mail">
                  <a href={`mailto:${cliente.email}`} className="link-pro inline-flex items-center gap-1">
                    <FiMail className="h-3.5 w-3.5" />
                    {cliente.email}
                  </a>
                </KeyValue>
              )}
              <KeyValue label="Endereço">
                {endereco ? (
                  <span className="inline-flex gap-1">
                    <FiMapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-ink-400" />
                    <span>
                      {endereco}
                      {cliente.cep && <span className="block text-xs text-ink-500">CEP {mascaraCEP(cliente.cep)}</span>}
                    </span>
                  </span>
                ) : null}
              </KeyValue>
              {!cliente.cep && (
                <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <FiAlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Sem CEP: necessário para emitir NFS-e.
                </p>
              )}
            </dl>
            {cliente.telefone && (
              <div className="mt-4 flex gap-2">
                <a href={`tel:${String(cliente.telefone).replace(/\D/g, "")}`} className="btn-secondary btn-sm flex-1">
                  <FiPhone className="h-3.5 w-3.5" /> Ligar
                </a>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="btn-secondary btn-sm flex-1">
                    <FiMessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
              </div>
            )}
          </Section>

          <Section
            title={`Veículos (${veiculos.length})`}
            icon={FiTruck}
            padded={false}
            actions={
              <button type="button" className="btn-ghost btn-sm" onClick={() => setVeiculoModal({})}>
                <FiPlus className="h-3.5 w-3.5" /> Adicionar
              </button>
            }
          >
            {veiculos.length === 0 ? (
              <EmptyState compact icon={FiTruck} title="Nenhum veículo cadastrado" />
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {veiculos.map((v) => {
                  const ativo = String(v.id) === String(veiculoFiltro);
                  return (
                    <li key={v.id} className={`flex items-center gap-2 px-4 py-3 ${ativo ? "bg-brand-50/70 dark:bg-brand-950/30" : ""}`}>
                      <button type="button" onClick={() => filtrarVeiculo(v.id)} className="flex-1 min-w-0 text-left" aria-pressed={ativo}>
                        <span className="inline-block rounded border border-ink-300 dark:border-ink-600 px-1.5 font-mono text-xs font-semibold text-ink-800 dark:text-ink-200">
                          {formatarPlaca(v.placa)}
                        </span>
                        <span className="block mt-1 text-sm font-medium text-ink-900 dark:text-white truncate">
                          {[v.marca, v.modelo, v.versao].filter(Boolean).join(" ")}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {[v.ano, v.cor, v.combustivel].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </button>
                      <button type="button" className="btn-ghost btn-sm !px-1.5" onClick={() => setVeiculoModal(v)} aria-label={`Editar ${v.placa}`} title="Editar veículo">
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {veiculoFiltro && (
              <div className="px-4 py-2.5 border-t border-ink-100 dark:border-ink-800">
                <button type="button" className="text-xs link-pro" onClick={() => filtrarVeiculo("")}>
                  Mostrar histórico de todos os veículos
                </button>
              </div>
            )}
          </Section>
        </div>

        <Section
          className="lg:col-span-2"
          title={veiculoSel ? `Histórico · ${formatarPlaca(veiculoSel.placa)} ${veiculoSel.modelo}` : "Histórico de atendimentos"}
          description={resumo.kmMax ? `Maior km registrado: ${resumo.kmMax.toLocaleString("pt-BR")} km` : undefined}
          icon={FiTool}
          padded={false}
        >
          {carregandoHist ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-10" />
              ))}
            </div>
          ) : ordens.length === 0 ? (
            <EmptyState
              compact
              icon={FiTool}
              title="Nenhum atendimento ainda"
              action={
                <Link to={novoAtendimentoUrl} className="btn-brand btn-sm">
                  <FiPlus className="h-3.5 w-3.5" /> Novo atendimento
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {ordens.map((os) => {
                const sit = situacaoPagamentoOs(os);
                return (
                  <li key={os.id}>
                    <Link to={`/ordens-servico/${os.id}`} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-ink-50 dark:hover:bg-ink-850 transition-colors group">
                      <div className="w-20 shrink-0">
                        <p className="text-sm font-semibold num text-ink-900 dark:text-white">{os.numero}</p>
                        <p className="text-2xs text-ink-500 num">{formatarData(os.criado_em)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink-800 dark:text-ink-200 truncate">
                          <span className="font-mono text-xs font-semibold">{formatarPlaca(os.veiculo_placa)}</span>
                          {" · "}
                          {[os.veiculo_marca, os.veiculo_modelo].filter(Boolean).join(" ")}
                          {os.km ? <span className="text-ink-500 num"> · {Number(os.km).toLocaleString("pt-BR")} km</span> : null}
                        </p>
                        {os.observacoes_veiculo && <p className="text-xs text-ink-500 truncate">{os.observacoes_veiculo}</p>}
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <StatusBadge kind="os" status={os.status} size="sm" />
                        {sit && os.status === "Finalizada" && sit !== "Quitada" && <StatusBadge kind="situacaoPagamento" status={sit} size="sm" />}
                      </div>
                      <p className="text-sm font-semibold num text-ink-900 dark:text-white w-24 text-right">{formatarMoeda(os.valor_total)}</p>
                      <FiChevronRight className="h-4 w-4 text-ink-300 group-hover:text-ink-500" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {historico?.total > LIMITE_HISTORICO && (
            <div className="px-5 py-3 border-t border-ink-100 dark:border-ink-800">
              <Link to={`/ordens-servico?cliente_id=${cliente.id}`} className="text-xs link-pro">
                Ver todas as {historico.total} OS deste cliente
              </Link>
            </div>
          )}
        </Section>
      </div>

      <ClienteFormModal
        isOpen={editarCliente}
        onClose={() => setEditarCliente(false)}
        clienteId={cliente.id}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["clientes"] });
          setEditarCliente(false);
        }}
      />
      <NovoVeiculoModal
        isOpen={!!veiculoModal}
        onClose={() => setVeiculoModal(null)}
        clienteId={cliente.id}
        veiculo={veiculoModal?.id ? veiculoModal : null}
        onVeiculoCriado={() => {
          recarregarVeiculos();
          qc.invalidateQueries({ queryKey: ["veiculos"] });
        }}
      />
    </div>
  );
}
