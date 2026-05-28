import { lazy, Suspense, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiTool,
  FiFileText,
  FiPackage,
  FiCalendar,
  FiDollarSign,
  FiPlus,
  FiArrowRight,
  FiBarChart2,
} from "react-icons/fi";
import { formatarData, formatarMoeda } from "../utils/formatters";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import { useDashboardData } from "../hooks/queries/useDashboard";

const DashboardCharts = lazy(
  () => import("../features/dashboard/DashboardCharts"),
);

export default function Home() {
  const { data, isLoading, isError } = useDashboardData();
  const relatorio = data?.relatorio;
  const agendamentosHoje = data?.agendamentosHoje ?? [];
  const alertasContas = data?.alertasContas ?? { vencidas: [], aVencer: [] };

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar o painel");
  }, [isError]);

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        title="Painel inicial"
        subtitle="Visão geral da oficina — ordens, orçamentos, agenda e financeiro."
        actions={
          <>
            <a href="#relatorios" className="btn-secondary hidden sm:inline-flex">
              <FiBarChart2 className="h-4 w-4" />
              Relatórios
            </a>
            <Link to="/orcamentos/novo" className="btn-brand">
              <FiPlus className="h-4 w-4" />
              Novo orçamento
            </Link>
          </>
        }
      />

      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="OS abertas"
              value={relatorio?.osAbertas ?? 0}
              link="/ordens-servico?status=Aberta"
              icon={FiTool}
              accent="brand"
            />
            <StatCard
              title="Orçamentos pendentes"
              value={relatorio?.orcamentosAtivos ?? 0}
              link="/orcamentos?status=Pendente"
              icon={FiFileText}
              accent="amber"
            />
            <StatCard
              title="Itens com estoque baixo"
              value={relatorio?.estoqueBaixo ?? 0}
              link="/estoque"
              icon={FiPackage}
              accent="red"
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Acesso rápido
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickLink
                to="/orcamentos/novo"
                title="Nova OS / orçamento"
                description="Abrir atendimento"
                icon={FiPlus}
              />
              <QuickLink
                to="/agendamentos"
                title="Agenda"
                description="Compromissos do dia"
                icon={FiCalendar}
              />
              <QuickLink
                to="/estoque"
                title="Estoque"
                description="Produtos e inventário"
                icon={FiPackage}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agendamentosHoje.length > 0 && (
              <section className="pro-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600">
                    <FiCalendar className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Agendamentos de hoje
                  </h3>
                </div>
                <ul className="space-y-2">
                  {agendamentosHoje.slice(0, 4).map((agend) => (
                    <li
                      key={agend.id}
                      className="flex justify-between items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {agend.cliente_nome}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {agend.tipo_servico}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-brand-600 shrink-0">
                        {agend.hora_inicio}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/agendamentos"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Ver agenda completa
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              </section>
            )}

            {(alertasContas.vencidas?.length > 0 ||
              alertasContas.aVencer?.length > 0) && (
              <section className="pro-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600">
                    <FiDollarSign className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Contas a pagar
                  </h3>
                </div>
                <ul className="space-y-2">
                  {alertasContas.vencidas?.slice(0, 3).map((conta) => (
                    <li
                      key={conta.id}
                      className="flex justify-between gap-3 p-3 rounded-lg bg-red-50/80 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {conta.descricao}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Vencida · {formatarData(conta.data_vencimento)}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-red-700 dark:text-red-400 shrink-0">
                        {formatarMoeda(conta.valor)}
                      </span>
                    </li>
                  ))}
                  {alertasContas.aVencer?.slice(0, 2).map((conta) => (
                    <li
                      key={conta.id}
                      className="flex justify-between gap-3 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {conta.descricao}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Vence · {formatarData(conta.data_vencimento)}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-amber-800 dark:text-amber-400 shrink-0">
                        {formatarMoeda(conta.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/contas-pagar"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Ver todas as contas
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              </section>
            )}
          </div>

          <Suspense fallback={<LoadingSpinner size="lg" />}>
            <DashboardCharts relatorio={relatorio} />
          </Suspense>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, link, icon: Icon, accent }) {
  const accents = {
    brand: "bg-brand-50 dark:bg-brand-950/40 text-brand-600",
    amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-600",
    red: "bg-red-50 dark:bg-red-950/40 text-red-600",
  };

  return (
    <Link to={link} className="pro-card-hover p-5 block group">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {value}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400 group-hover:text-brand-600 transition-colors flex items-center gap-1">
        Ver detalhes
        <FiArrowRight className="h-3.5 w-3.5" />
      </p>
    </Link>
  );
}

function QuickLink({ to, title, description, icon: Icon }) {
  return (
    <Link
      to={to}
      className="pro-card-hover p-4 flex items-start gap-3 group"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:bg-brand-950 transition-colors">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </Link>
  );
}
