import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiActivity,
  FiInbox,
  FiAlertTriangle,
  FiCheck,
  FiDollarSign,
  FiExternalLink,
} from "react-icons/fi";
import api from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import StatCard from "../components/ui/StatCard";
import Section from "../components/ui/Section";
import StatusBadge from "../components/ui/StatusBadge";
import FilterChips from "../components/ui/FilterChips";
import EmptyState from "../components/ui/EmptyState";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import { SkeletonRows } from "../components/ui/Skeleton";
import { formatarMoeda, formatarData } from "../utils/formatters";
import { statusRecebimento } from "../utils/statusColors";
import { unwrapListResponse, unwrapPagination } from "../utils/apiList";
import { formatarPlaca } from "../features/os/osHelpers";

const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function periodoPreset(chave) {
  const hoje = new Date();
  if (chave === "mes_passado") {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return { inicio: iso(ini), fim: iso(fim) };
  }
  if (chave === "30d") {
    const ini = new Date(hoje);
    ini.setDate(ini.getDate() - 29);
    return { inicio: iso(ini), fim: iso(hoje) };
  }
  if (chave === "ano") return { inicio: `${hoje.getFullYear()}-01-01`, fim: iso(hoje) };
  return { inicio: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: iso(hoje) };
}

function FluxoDiario({ serie = [] }) {
  if (!serie.length) return <EmptyState compact icon={FiActivity} title="Sem movimentação no período" />;
  const max = Math.max(...serie.flatMap((d) => [d.entradas, d.saidas]), 1);
  let acumulado = 0;
  return (
    <div className="overflow-x-auto scrollbar-none">
      <div className="flex items-end gap-1.5 h-40 min-w-full" style={{ minWidth: `${serie.length * 28}px` }}>
        {serie.map((d) => {
          acumulado += d.entradas - d.saidas;
          return (
            <div key={d.dia} className="flex-1 min-w-[22px] flex flex-col items-center gap-1 group" title={`${formatarData(d.dia)} · entradas ${formatarMoeda(d.entradas)} · saídas ${formatarMoeda(d.saidas)} · saldo acumulado ${formatarMoeda(acumulado)}`}>
              <div className="w-full flex items-end justify-center gap-0.5 h-32">
                <div className="w-1/2 max-w-[14px] rounded-t bg-emerald-500" style={{ height: `${(d.entradas / max) * 100}%` }} />
                <div className="w-1/2 max-w-[14px] rounded-t bg-red-400" style={{ height: `${(d.saidas / max) * 100}%` }} />
              </div>
              <span className="text-[10px] text-ink-500 num">{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Entradas (recebimentos de OS)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-red-400" />Saídas (contas pagas)</span>
      </div>
    </div>
  );
}

function AReceber({ statusInicial }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(statusInicial || "Pendente");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["financeiro", "receber", status, busca, pagina],
    queryFn: async () => {
      const { data: r } = await api.get("/financeiro/receber", {
        params: { status: status || undefined, busca: busca || undefined, page: pagina, limit: 20 },
      });
      return { rows: unwrapListResponse(r), pagination: unwrapPagination(r) };
    },
    placeholderData: (p) => p,
  });
  const rows = data?.rows ?? [];

  const receber = async (p) => {
    try {
      await api.put(`/ordens-servico/${p.os_id}/pagamentos/${p.id}`, { status: "Recebido", data_pagamento: iso(new Date()) });
      toast.success("Recebimento registrado.");
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      qc.invalidateQueries({ queryKey: ["ordens-servico"] });
    } catch (error) {
      toast.error(error.response?.data?.error || "Não foi possível registrar.");
    }
  };

  return (
    <>
      <div className="space-y-3 mb-4">
        <FilterChips
          options={[
            { value: "Pendente", label: "A receber", dot: "bg-amber-500" },
            { value: "Vencido", label: "Vencidos", dot: "bg-red-500" },
            { value: "Recebido", label: "Recebidos", dot: "bg-emerald-500" },
            { value: "", label: "Todos" },
          ]}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPagina(1);
          }}
        />
        <SearchBar onSearch={(v) => { setBusca(v.trim()); setPagina(1); }} placeholder="Buscar por nº da OS ou cliente…" />
      </div>
      <div className="pro-card overflow-hidden">
        {isLoading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon={FiInbox} title="Nada por aqui" description="Parcelas a receber são lançadas no painel de pagamento de cada OS." />
        ) : (
          <table className="table-pro">
            <thead>
              <tr>
                <th>Vencimento / pagamento</th>
                <th>OS / cliente</th>
                <th className="hidden md:table-cell">Forma</th>
                <th className="text-right">Valor</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="text-right"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const st = statusRecebimento(p);
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap num">
                      {formatarData(p.status === "Recebido" ? p.data_pagamento : p.data_vencimento)}
                      <span className="block text-2xs text-ink-500">{p.status === "Recebido" ? "recebido" : "vencimento"}</span>
                    </td>
                    <td>
                      <Link to={`/ordens-servico/${p.os_id}`} className="font-medium text-ink-900 dark:text-white hover:text-brand-600 num">
                        {p.os_numero}
                      </Link>
                      <p className="text-xs text-ink-500">{p.cliente_nome}</p>
                    </td>
                    <td className="hidden md:table-cell">{p.forma_pagamento}</td>
                    <td className="text-right font-semibold num text-ink-900 dark:text-ink-100">{formatarMoeda(p.valor)}</td>
                    <td className="hidden sm:table-cell"><StatusBadge kind="pagamento" status={st} size="sm" /></td>
                    <td className="text-right">
                      {p.status === "Pendente" && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => receber(p)}>
                          <FiCheck className="h-3.5 w-3.5" /> Recebido
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination currentPage={pagina} totalPages={data?.pagination?.pages ?? 1} onPageChange={setPagina} itemsPerPage={20} totalItems={data?.pagination?.total ?? 0} />
      </div>
    </>
  );
}

function Pendencias() {
  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ["ordens-servico", "finalizadas-saldo"],
    queryFn: async () => {
      const { data } = await api.get("/ordens-servico", {
        params: { status: "Finalizada", limit: 200, page: 1, ordenar: "criado_em", direcao: "desc" },
      });
      return unwrapListResponse(data).filter((o) => Number(o.valor_total) - Number(o.valor_recebido || 0) > 0.009);
    },
  });
  return (
    <div className="pro-card overflow-hidden">
      <p className="px-4 sm:px-5 py-3 text-xs text-ink-500 border-b border-ink-100 dark:border-ink-800">
        OS finalizadas (200 mais recentes) com saldo ainda não recebido. Registre o pagamento na própria OS.
      </p>
      {isLoading ? (
        <SkeletonRows rows={4} cols={4} />
      ) : ordens.length === 0 ? (
        <EmptyState compact icon={FiCheck} title="Todas as OS finalizadas estão quitadas" />
      ) : (
        <table className="table-pro">
          <thead>
            <tr>
              <th>OS</th>
              <th>Cliente / veículo</th>
              <th className="text-right hidden sm:table-cell">Total</th>
              <th className="text-right hidden sm:table-cell">Recebido</th>
              <th className="text-right">Saldo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ordens.map((o) => (
              <tr key={o.id}>
                <td className="num font-semibold whitespace-nowrap">
                  {o.numero}
                  <span className="block text-2xs font-normal text-ink-500">{formatarData(o.finalizado_em || o.criado_em)}</span>
                </td>
                <td>
                  <p className="text-ink-900 dark:text-ink-100">{o.cliente_nome}</p>
                  <p className="text-xs text-ink-500 font-mono">{formatarPlaca(o.veiculo_placa)}</p>
                </td>
                <td className="text-right num hidden sm:table-cell">{formatarMoeda(o.valor_total)}</td>
                <td className="text-right num hidden sm:table-cell">{formatarMoeda(o.valor_recebido)}</td>
                <td className="text-right num font-semibold text-amber-700 dark:text-amber-300">
                  {formatarMoeda(Number(o.valor_total) - Number(o.valor_recebido || 0))}
                </td>
                <td className="text-right">
                  <Link to={`/ordens-servico/${o.id}`} className="btn-secondary btn-sm">
                    Abrir OS <FiExternalLink className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Financeiro() {
  const [searchParams, setSearchParams] = useSearchParams();
  const aba = searchParams.get("aba") || "resumo";
  const [preset, setPreset] = useState("mes");
  const [custom, setCustom] = useState(() => periodoPreset("mes"));
  const periodo = useMemo(() => (preset === "custom" ? custom : periodoPreset(preset)), [preset, custom]);

  const { data: resumo, isLoading } = useQuery({
    queryKey: ["financeiro", "resumo", periodo.inicio, periodo.fim],
    queryFn: async () => (await api.get("/financeiro/resumo", { params: { data_inicio: periodo.inicio, data_fim: periodo.fim } })).data,
    enabled: aba === "resumo",
  });

  const setAba = (v) => {
    const next = new URLSearchParams();
    next.set("aba", v);
    setSearchParams(next, { replace: true });
  };

  const abas = [
    ["resumo", "Resumo e fluxo de caixa"],
    ["receber", "Contas a receber"],
    ["pendencias", "OS sem quitação"],
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title="Visão financeira"
        subtitle="Recebimentos das OS, contas pagas e o que falta entrar ou sair."
        actions={
          <Link to="/contas-pagar" className="btn-secondary">
            <FiDollarSign className="h-4 w-4" /> Contas a pagar
          </Link>
        }
      />

      <div className="flex gap-1 border-b border-ink-200 dark:border-ink-800 mb-5 overflow-x-auto scrollbar-none" role="tablist">
        {abas.map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={aba === v}
            onClick={() => setAba(v)}
            className={`px-3 py-2 -mb-px border-b-2 text-sm font-medium whitespace-nowrap ${
              aba === v ? "border-brand-600 text-ink-900 dark:text-white" : "border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {aba === "receber" && <AReceber statusInicial={searchParams.get("status") || "Pendente"} />}
      {aba === "pendencias" && <Pendencias />}
      {aba === "resumo" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <FilterChips
              className="flex-1"
              options={[
                { value: "mes", label: "Este mês" },
                { value: "mes_passado", label: "Mês passado" },
                { value: "30d", label: "Últimos 30 dias" },
                { value: "ano", label: "Ano" },
                { value: "custom", label: "Personalizado" },
              ]}
              value={preset}
              onChange={setPreset}
              ariaLabel="Período"
            />
            {preset === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" className="input-pro" value={custom.inicio} onChange={(e) => setCustom((c) => ({ ...c, inicio: e.target.value }))} aria-label="Início" />
                <span className="text-ink-400">–</span>
                <input type="date" className="input-pro" value={custom.fim} onChange={(e) => setCustom((c) => ({ ...c, fim: e.target.value }))} aria-label="Fim" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Entradas" value={resumo ? formatarMoeda(resumo.entradas) : "—"} hint="Recebimentos de OS" icon={FiArrowDownCircle} accent="green" loading={isLoading} emphasis />
            <StatCard label="Saídas" value={resumo ? formatarMoeda(resumo.saidas) : "—"} hint="Contas pagas" icon={FiArrowUpCircle} accent="red" loading={isLoading} emphasis />
            <StatCard
              label="Saldo do período"
              value={resumo ? formatarMoeda(resumo.saldo) : "—"}
              hint={`${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}`}
              icon={FiActivity}
              accent={resumo?.saldo < 0 ? "red" : "brand"}
              loading={isLoading}
              emphasis
            />
            <StatCard
              label="OS sem quitação"
              value={resumo ? formatarMoeda(resumo.os_finalizadas_sem_quitacao.valor) : "—"}
              hint={resumo ? `${resumo.os_finalizadas_sem_quitacao.quantidade} OS finalizada(s)` : undefined}
              icon={FiAlertTriangle}
              accent={resumo?.os_finalizadas_sem_quitacao?.quantidade ? "amber" : "gray"}
              loading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <Section className="lg:col-span-2" title="Fluxo de caixa diário" icon={FiActivity}>
              {isLoading ? <div className="skeleton h-40" /> : <FluxoDiario serie={resumo?.serie} />}
            </Section>
            <div className="space-y-5">
              <Section title="Em aberto (geral)">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-600 dark:text-ink-300">
                      <button type="button" className="link-pro" onClick={() => setAba("receber")}>A receber</button>
                      <span className="block text-2xs text-ink-500">{resumo?.a_receber?.quantidade ?? 0} parcela(s)</span>
                    </dt>
                    <dd className="text-right num font-semibold">
                      {formatarMoeda(resumo?.a_receber?.total || 0)}
                      {resumo?.a_receber?.vencido > 0 && <span className="block text-2xs text-red-600">{formatarMoeda(resumo.a_receber.vencido)} vencido</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-600 dark:text-ink-300">
                      <Link to="/contas-pagar" className="link-pro">A pagar</Link>
                      <span className="block text-2xs text-ink-500">{resumo?.a_pagar?.quantidade ?? 0} conta(s)</span>
                    </dt>
                    <dd className="text-right num font-semibold">
                      {formatarMoeda(resumo?.a_pagar?.total || 0)}
                      {resumo?.a_pagar?.vencido > 0 && <span className="block text-2xs text-red-600">{formatarMoeda(resumo.a_pagar.vencido)} vencido</span>}
                    </dd>
                  </div>
                </dl>
              </Section>
              <Section title="Recebido por forma de pagamento">
                {!resumo?.por_forma?.length ? (
                  <p className="text-sm text-ink-500">Sem recebimentos no período.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {resumo.por_forma.map((f) => {
                      const pct = resumo.entradas > 0 ? (f.total / resumo.entradas) * 100 : 0;
                      return (
                        <li key={f.forma_pagamento}>
                          <div className="flex justify-between text-sm">
                            <span className="text-ink-700 dark:text-ink-200">{f.forma_pagamento}</span>
                            <span className="num font-medium">{formatarMoeda(f.total)}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                            <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
