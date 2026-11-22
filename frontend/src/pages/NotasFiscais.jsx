import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FiFileText, FiChevronDown, FiChevronRight, FiDownload, FiExternalLink, FiAlertTriangle } from "react-icons/fi";
import api from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import FilterChips from "../components/ui/FilterChips";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { TONES, STATUS_TONE } from "../utils/statusColors";
import { unwrapListResponse, unwrapPagination } from "../utils/apiList";
import { formatarMoeda, formatarDataHora } from "../utils/formatters";
import { mensagemRejeicaoNota, mostrarObservacoesNota } from "../features/os/fiscalUtils";
import { resolvePdfUrl, abrirDanfePdf } from "../features/os/notaFiscalPdf";

const POR_PAGINA = 20;

function numeroLegivel(n) {
  return /^\d{1,15}$/.test(String(n || "")) ? String(n) : null;
}

/**
 * Histórico fiscal: todas as NFS-e/NF-e emitidas, com filtros e motivo de
 * rejeição. Somente leitura — emissão, reemissão e cancelamento continuam na OS.
 */
export default function NotasFiscais() {
  const [status, setStatus] = useState("");
  const [modelo, setModelo] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [pagina, setPagina] = useState(1);
  const [aberta, setAberta] = useState(null);

  const params = {
    status: status || undefined,
    modelo: modelo || undefined,
    busca: busca || undefined,
    data_inicio: dataInicio || undefined,
    data_fim: dataFim || undefined,
    page: pagina,
    limit: POR_PAGINA,
  };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["notas-fiscais", params],
    queryFn: async () => {
      const { data: r } = await api.get("/notas-fiscais", { params });
      return { rows: unwrapListResponse(r), pagination: unwrapPagination(r) };
    },
    placeholderData: (p) => p,
    refetchInterval: (q) => (q.state.data?.rows || []).some((n) => n.status_nf === "processamento") ? 30_000 : false,
  });
  const notas = data?.rows ?? [];

  const mudar = (fn) => (v) => {
    fn(v);
    setPagina(1);
  };

  const abrirPdf = async (nota) => {
    const pdf = resolvePdfUrl(nota);
    if (!pdf) {
      toast.error("PDF oficial ainda indisponível. Abra a OS e use Atualizar status.");
      return;
    }
    await abrirDanfePdf(pdf);
  };

  const statusOpts = [
    { value: "", label: "Todas" },
    ...["autorizada", "processamento", "rejeitada", "cancelada"].map((s) => ({
      value: s,
      label: { autorizada: "Autorizadas", processamento: "Processando", rejeitada: "Rejeitadas", cancelada: "Canceladas" }[s],
      dot: TONES[STATUS_TONE.nf[s]].dot,
    })),
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title="Notas fiscais"
        subtitle="Histórico de NFS-e (Notaas) e NF-e (Brasil NFe). A emissão e o cancelamento são feitos na OS."
      />

      <div className="space-y-3 mb-4">
        <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
          <FilterChips className="flex-1" options={statusOpts} value={status} onChange={mudar(setStatus)} ariaLabel="Status" />
          <select className="input-pro lg:w-48" value={modelo} onChange={(e) => mudar(setModelo)(e.target.value)} aria-label="Documento">
            <option value="">NFS-e e NF-e</option>
            <option value="NFSE">Somente NFS-e</option>
            <option value="NFE">Somente NF-e</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <SearchBar onSearch={(v) => mudar(setBusca)(v.trim())} placeholder="Nº da nota, nº da OS, cliente ou chave de acesso…" />
          <input type="date" className="input-pro" value={dataInicio} onChange={(e) => mudar(setDataInicio)(e.target.value)} aria-label="Emitidas a partir de" title="Emitidas a partir de" />
          <input type="date" className="input-pro" value={dataFim} onChange={(e) => mudar(setDataFim)(e.target.value)} aria-label="Emitidas até" title="Emitidas até" />
        </div>
      </div>

      <div className="pro-card overflow-hidden relative">
        {isFetching && !isLoading && <div className="absolute top-0 inset-x-0 h-0.5 bg-brand-500/70 animate-pulse" />}
        {isLoading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : notas.length === 0 ? (
          <EmptyState icon={FiFileText} title="Nenhuma nota encontrada" description="As notas aparecem aqui depois de emitidas a partir de uma OS finalizada." />
        ) : (
          <table className="table-pro">
            <thead>
              <tr>
                <th className="w-8" />
                <th>Documento</th>
                <th>OS / cliente</th>
                <th className="hidden md:table-cell">Emissão</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
                <th className="text-right"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {notas.map((n) => {
                const expand = aberta === n.id;
                const rejeitada = n.status_nf === "rejeitada" || n.status_nf === "erro_autenticacao";
                const obs = rejeitada ? mensagemRejeicaoNota(n) : mostrarObservacoesNota(n) ? n.observacoes : null;
                const doc = n.modelo_documento === "NFE" ? "NF-e" : "NFS-e";
                return [
                  <tr key={n.id} className="row-link" onClick={() => setAberta(expand ? null : n.id)}>
                    <td className="!pr-0 text-ink-400">{expand ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}</td>
                    <td>
                      <p className="font-medium text-ink-900 dark:text-white">
                        {doc}
                        {numeroLegivel(n.numero) && <span className="num"> nº {n.numero}</span>}
                      </p>
                      <p className="text-2xs text-ink-500">{n.provedor === "brasil_nfe" ? "Brasil NFe" : "Notaas"}</p>
                    </td>
                    <td>
                      {n.ordem_servico_id ? (
                        <Link to={`/ordens-servico/${n.ordem_servico_id}`} onClick={(e) => e.stopPropagation()} className="font-medium num hover:text-brand-600">
                          {n.os_numero || `OS #${n.ordem_servico_id}`}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <p className="text-xs text-ink-500 truncate max-w-[14rem]">{n.cliente_nome}</p>
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap num text-xs">{n.data_emissao ? formatarDataHora(n.data_emissao) : formatarDataHora(n.criado_em)}</td>
                    <td className="text-right num font-semibold text-ink-900 dark:text-ink-100">{formatarMoeda(n.valor_total)}</td>
                    <td>
                      <StatusBadge kind="nf" status={n.status_nf} size="sm" />
                      {rejeitada && <FiAlertTriangle className="inline h-3.5 w-3.5 ml-1 text-red-500" aria-label="Ver motivo" />}
                    </td>
                    <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {n.status_nf === "autorizada" && (
                        <button type="button" className="btn-ghost btn-sm" onClick={() => abrirPdf(n)} title="Abrir PDF oficial">
                          <FiDownload className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline">PDF</span>
                        </button>
                      )}
                    </td>
                  </tr>,
                  expand && (
                    <tr key={`${n.id}-d`} className="!bg-ink-50/70 dark:!bg-ink-850/50">
                      <td />
                      <td colSpan={6} className="!pt-0">
                        <div className="grid sm:grid-cols-3 gap-3 text-xs py-2">
                          <div>
                            <p className="text-ink-500">Chave de acesso</p>
                            <p className="font-mono break-all text-ink-800 dark:text-ink-200">{n.chave_acesso || "—"}</p>
                          </div>
                          <div>
                            <p className="text-ink-500">Tributos</p>
                            <p className="num text-ink-800 dark:text-ink-200">
                              ISS {formatarMoeda(n.valor_iss)} · ICMS {formatarMoeda(n.valor_icms)}
                            </p>
                          </div>
                          <div>
                            <p className="text-ink-500">Status no provedor</p>
                            <p className="text-ink-800 dark:text-ink-200">{n.status_provedor || "—"}</p>
                          </div>
                          {obs && (
                            <div className={`sm:col-span-3 rounded-lg p-2.5 whitespace-pre-line ${rejeitada ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" : "bg-ink-100 dark:bg-ink-800"}`}>
                              {rejeitada && <p className="font-semibold mb-0.5">Motivo da rejeição</p>}
                              {obs}
                            </div>
                          )}
                          {n.ordem_servico_id && (
                            <div className="sm:col-span-3">
                              <Link to={`/ordens-servico/${n.ordem_servico_id}`} className="link-pro inline-flex items-center gap-1">
                                {rejeitada ? "Corrigir e reemitir na OS" : "Abrir OS"} <FiExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        )}
        <Pagination currentPage={pagina} totalPages={data?.pagination?.pages ?? 1} onPageChange={setPagina} itemsPerPage={POR_PAGINA} totalItems={data?.pagination?.total ?? 0} />
      </div>
    </div>
  );
}
