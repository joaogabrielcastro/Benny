import { useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiTool,
  FiPlay,
  FiCheckCircle,
  FiFileText,
  FiDollarSign,
  FiTrendingUp,
  FiAlertTriangle,
  FiCalendar,
  FiPackage,
  FiArrowRight,
  FiInbox,
} from "react-icons/fi";
import { formatarData, formatarMoeda } from "../utils/formatters";
import PageHeader from "../components/layout/PageHeader";
import StatCard from "../components/ui/StatCard";
import Section from "../components/ui/Section";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { useDashboardData, usePainelOperacional } from "../hooks/queries/useDashboard";
import { useAuth } from "../contexts/AuthContext";
import { formatarPlaca, rotuloVeiculoSemPlaca, tempoRelativo } from "../features/os/osHelpers";

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function MiniBarras({ dados = [] }) {
  if (!dados.length) return <p className="text-xs text-ink-500">Sem faturamento nos últimos meses.</p>;
  const max = Math.max(...dados.map((d) => Number(d.valor) || 0), 1);
  return (
    <div className="flex items-end gap-2 h-24" role="img" aria-label="Faturamento dos últimos meses">
      {dados.map((d) => {
        const v = Number(d.valor) || 0;
        return (
          <div key={d.mes} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
            <span className="text-[10px] num text-ink-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {formatarMoeda(v)}
            </span>
            <div
              className="w-full max-w-[2.75rem] rounded-t bg-brand-500/80 group-hover:bg-brand-600 transition-colors min-h-[2px]"
              style={{ height: `${Math.max(2, (v / max) * 64)}px` }}
              title={`${d.mes}: ${formatarMoeda(v)}`}
            />
            <span className="text-[10px] text-ink-500 truncate">{d.mes}</span>
          </div>
        );
      })}
    </div>
  );
}

function AlertaLinha({ to, icon: Icon, tom, titulo, detalhe }) {
  const cores = {
    red: "text-red-600 bg-red-50 dark:bg-red-950/40",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    blue: "text-brand-600 bg-brand-50 dark:bg-brand-950/40",
  };
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-ink-50 dark:hover:bg-ink-850 transition-colors">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cores[tom]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink-900 dark:text-white">{titulo}</span>
          {detalhe && <span className="block text-xs text-ink-500 truncate">{detalhe}</span>}
        </span>
        <FiArrowRight className="h-4 w-4 text-ink-300" />
      </Link>
    </li>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useDashboardData();
  const { data: op, isLoading: opLoading } = usePainelOperacional();
  const relatorio = data?.relatorio;
  const agendamentosHoje = data?.agendamentosHoje ?? [];
  const alertasContas = data?.alertasContas ?? { vencidas: [], aVencer: [] };
  const fin = op?.financeiro;

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar o painel");
  }, [isError]);

  const naOficina = op?.naOficina ?? [];
  const alertas = [];
  if (fin?.a_receber?.vencido > 0)
    alertas.push({
      to: "/financeiro?aba=receber&status=Vencido",
      icon: FiDollarSign,
      tom: "red",
      titulo: `${formatarMoeda(fin.a_receber.vencido)} a receber vencidos`,
      detalhe: "Parcelas de OS com vencimento passado",
    });
  if (fin?.os_finalizadas_sem_quitacao?.quantidade > 0)
    alertas.push({
      to: "/financeiro?aba=pendencias",
      icon: FiCheckCircle,
      tom: "amber",
      titulo: `${fin.os_finalizadas_sem_quitacao.quantidade} OS finalizada(s) sem quitação`,
      detalhe: `${formatarMoeda(fin.os_finalizadas_sem_quitacao.valor)} em aberto`,
    });
  if (alertasContas.vencidas?.length)
    alertas.push({
      to: "/contas-pagar?status=Vencida",
      icon: FiAlertTriangle,
      tom: "red",
      titulo: `${alertasContas.vencidas.length} conta(s) a pagar vencida(s)`,
      detalhe: alertasContas.vencidas
        .slice(0, 2)
        .map((c) => `${c.descricao} · ${formatarMoeda(c.valor)}`)
        .join(" — "),
    });
  if (alertasContas.aVencer?.length)
    alertas.push({
      to: "/contas-pagar",
      icon: FiCalendar,
      tom: "amber",
      titulo: `${alertasContas.aVencer.length} conta(s) vencem em 7 dias`,
      detalhe: alertasContas.aVencer
        .slice(0, 2)
        .map((c) => `${c.descricao} · ${formatarData(c.data_vencimento)}`)
        .join(" — "),
    });
  if (op?.estoqueBaixo?.length)
    alertas.push({
      to: "/estoque?filtro=baixo",
      icon: FiPackage,
      tom: op.estoqueBaixo.some((p) => Number(p.quantidade) <= 0) ? "red" : "amber",
      titulo: `${op.estoqueBaixo.length} peça(s) com estoque baixo`,
      detalhe: op.estoqueBaixo
        .slice(0, 3)
        .map((p) => `${p.nome} (${Number(p.quantidade)})`)
        .join(", "),
    });

  const carregando = isLoading || opLoading;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title={`${saudacao()}${user?.nome ? `, ${user.nome.split(" ")[0]}` : ""}`}
        subtitle={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        actions={
          <>
            <Link to="/relatorios" className="btn-secondary hidden sm:inline-flex">
              Relatórios
            </Link>
            <Link to="/orcamentos/novo" className="btn-brand">
              <FiPlus className="h-4 w-4" />
              Novo atendimento
            </Link>
          </>
        }
      />

      <section aria-label="Oficina">
        <p className="eyebrow mb-2">Oficina</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Aguardando início" value={op?.osAbertas ?? "—"} hint="OS abertas" icon={FiTool} accent="brand" to="/ordens-servico?status=Aberta" loading={carregando} />
          <StatCard label="Em execução" value={op?.osAndamento ?? "—"} hint="Serviços em andamento" icon={FiPlay} accent="amber" to="/ordens-servico?status=Em+andamento" loading={carregando} />
          <StatCard label="Orçamentos aguardando" value={op?.orcamentosPendentes?.total ?? relatorio?.orcamentosAtivos ?? "—"} hint="Resposta do cliente" icon={FiFileText} accent="violet" to="/orcamentos?status=Pendente" loading={carregando} />
          <StatCard label="Finalizadas" value={op?.osFinalizadas ?? "—"} hint="Total de OS concluídas" icon={FiCheckCircle} accent="green" to="/ordens-servico?status=Finalizada" loading={carregando} />
        </div>
      </section>

      <section aria-label="Financeiro">
        <p className="eyebrow mb-2">Financeiro do mês</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Faturamento (OS finalizadas)"
            value={relatorio ? formatarMoeda(relatorio.faturamentoMes) : "—"}
            hint={relatorio ? `Ticket médio ${formatarMoeda(relatorio.ticketMedio)}` : "Requer plano com relatórios"}
            icon={FiTrendingUp}
            accent="brand"
            loading={carregando}
            emphasis
          />
          <StatCard
            label="Recebido"
            value={fin ? formatarMoeda(fin.entradas) : "—"}
            hint={fin ? `Saídas pagas ${formatarMoeda(fin.saidas)}` : undefined}
            icon={FiDollarSign}
            accent="green"
            to="/financeiro"
            loading={carregando}
            emphasis
          />
          <StatCard
            label="A receber"
            value={fin ? formatarMoeda(fin.a_receber.total) : "—"}
            hint={fin ? (fin.a_receber.vencido > 0 ? `${formatarMoeda(fin.a_receber.vencido)} vencido` : `${fin.a_receber.quantidade} parcela(s)`) : undefined}
            icon={FiInbox}
            accent={fin?.a_receber?.vencido > 0 ? "red" : "amber"}
            to="/financeiro?aba=receber"
            loading={carregando}
          />
          <StatCard
            label="Contas a pagar"
            value={fin ? formatarMoeda(fin.a_pagar.total) : "—"}
            hint={fin ? (fin.a_pagar.vencido > 0 ? `${formatarMoeda(fin.a_pagar.vencido)} vencido` : `${fin.a_pagar.quantidade} pendente(s)`) : undefined}
            icon={FiAlertTriangle}
            accent={fin?.a_pagar?.vencido > 0 ? "red" : "gray"}
            to="/contas-pagar"
            loading={carregando}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Section
          className="lg:col-span-2"
          title="Na oficina agora"
          description="OS abertas e em execução, das mais antigas para as mais novas"
          icon={FiTool}
          padded={false}
          actions={
            <Link to="/ordens-servico" className="text-xs link-pro">
              Ver todas
            </Link>
          }
        >
          {carregando ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-10" />
              ))}
            </div>
          ) : naOficina.length === 0 ? (
            <EmptyState compact icon={FiCheckCircle} title="Nenhum veículo em atendimento" description="Quando um orçamento for aprovado, a OS aparece aqui." />
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {naOficina.slice(0, 8).map((os) => (
                <li key={os.id}>
                  <Link to={`/ordens-servico/${os.id}`} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-ink-50 dark:hover:bg-ink-850 transition-colors">
                    <span className="hidden sm:inline-flex rounded border border-ink-300 dark:border-ink-600 px-1.5 py-0.5 font-mono text-xs font-semibold text-ink-800 dark:text-ink-200 w-[5.5rem] justify-center">
                      {formatarPlaca(os.veiculo_placa)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-900 dark:text-white truncate">
                        {rotuloVeiculoSemPlaca(os)} <span className="text-ink-500 font-normal">· {os.cliente_nome}</span>
                      </span>
                      <span className="block text-xs text-ink-500">
                        <span className="sm:hidden font-mono">{formatarPlaca(os.veiculo_placa)} · </span>
                        {os.numero} · entrou {tempoRelativo(os.criado_em)}
                        {os.responsavel_tecnico ? ` · ${os.responsavel_tecnico}` : ""}
                      </span>
                    </span>
                    <StatusBadge kind="os" status={os.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {naOficina.length > 8 && (
            <p className="px-5 py-2.5 text-xs text-ink-500 border-t border-ink-100 dark:border-ink-800">
              +{naOficina.length - 8} outras em atendimento
            </p>
          )}
        </Section>

        <div className="space-y-5">
          <Section title="Atenção" icon={FiAlertTriangle} padded={false}>
            {carregando ? (
              <div className="p-5"><div className="skeleton h-10" /></div>
            ) : alertas.length === 0 ? (
              <EmptyState compact icon={FiCheckCircle} title="Tudo em dia" description="Sem pendências financeiras ou de estoque." />
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {alertas.map((a) => (
                  <AlertaLinha key={a.titulo} {...a} />
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Agenda de hoje"
            icon={FiCalendar}
            padded={false}
            actions={<Link to="/agendamentos" className="text-xs link-pro">Abrir agenda</Link>}
          >
            {agendamentosHoje.length === 0 ? (
              <EmptyState compact icon={FiCalendar} title="Nenhum agendamento hoje" />
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {agendamentosHoje.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
                    <span className="text-sm font-semibold num text-brand-700 dark:text-brand-300 w-12">{String(a.hora_inicio).slice(0, 5)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink-900 dark:text-white truncate">{a.cliente_nome}</span>
                      <span className="block text-xs text-ink-500 truncate">
                        {a.tipo_servico}
                        {a.veiculo_placa ? ` · ${formatarPlaca(a.veiculo_placa)}` : ""}
                      </span>
                    </span>
                    <StatusBadge kind="agendamento" status={a.status} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {relatorio?.faturamentoMensal && (
            <Section title="Faturamento — 6 meses" icon={FiTrendingUp}>
              <MiniBarras dados={relatorio.faturamentoMensal} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
