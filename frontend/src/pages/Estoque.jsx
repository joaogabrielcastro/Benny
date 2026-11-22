import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPackage,
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiClock,
  FiRepeat,
} from "react-icons/fi";
import api from "../services/api";
import { formatarMoeda, formatarDataHora } from "../utils/formatters";
import { useDebounce } from "../hooks/useDebounce";
import { useProdutosPaginated } from "../hooks/queries/useProdutosList";
import PageHeader from "../components/layout/PageHeader";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import ProdutoFormModal from "../components/ProdutoFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";
import FilterChips from "../components/ui/FilterChips";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useCategorias } from "../components/ServicoFormModal";
import { unwrapListResponse, unwrapPagination } from "../utils/apiList";

const ITEMS_PER_PAGE = 20;

function NivelEstoque({ quantidade, minimo }) {
  const q = Number(quantidade || 0);
  const m = Number(minimo || 0);
  const tom = q <= 0 ? "bg-red-500" : q <= m ? "bg-amber-500" : "bg-emerald-500";
  const texto = q <= 0 ? "text-red-600 dark:text-red-400" : q <= m ? "text-amber-700 dark:text-amber-300" : "text-ink-900 dark:text-white";
  const pct = Math.min(100, m > 0 ? (q / (m * 2)) * 100 : q > 0 ? 100 : 0);
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden lg:block w-16 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden" aria-hidden>
        <div className={`h-full ${tom}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-semibold num ${texto}`}>{q}</span>
      <span className="text-2xs text-ink-400 num">/ mín {m}</span>
    </div>
  );
}

function MovimentarModal({ produto, onClose, onSalvo }) {
  const [tipo, setTipo] = useState("ENTRADA");
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const sugestoes = tipo === "ENTRADA" ? ["Compra de fornecedor", "Devolução de cliente", "Ajuste de inventário"] : ["Uso interno", "Perda / avaria", "Ajuste de inventário"];
  const novoSaldo = Number(produto.quantidade || 0) + (tipo === "ENTRADA" ? 1 : -1) * Number(quantidade || 0);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post(`/produtos/${produto.id}/movimentacoes`, { tipo, quantidade: Number(quantidade), motivo });
      toast.success(tipo === "ENTRADA" ? "Entrada registrada." : "Saída registrada.");
      onSalvo();
      onClose();
    } catch (error) {
      const d = error.response?.data;
      toast.error((d?.details?.fieldErrors && Object.values(d.details.fieldErrors).flat()[0]) || d?.error || "Erro ao movimentar estoque");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Movimentar estoque"
      description={`${produto.nome} · saldo atual ${Number(produto.quantidade)}`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="form-mov" className="btn-brand" disabled={salvando || novoSaldo < 0 || motivo.trim().length < 3}>
            {salvando ? "Salvando…" : "Registrar"}
          </button>
        </>
      }
    >
      <form id="form-mov" onSubmit={salvar} className="space-y-3">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
          {[
            ["ENTRADA", "Entrada", FiArrowDownCircle, "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"],
            ["SAIDA", "Saída", FiArrowUpCircle, "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"],
          ].map(([v, l, Icon, ativo]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={tipo === v}
              onClick={() => {
                setTipo(v);
                setMotivo("");
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                tipo === v ? ativo : "border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {l}
            </button>
          ))}
        </div>
        <div>
          <label className="label-pro" htmlFor="mov-qtd">Quantidade</label>
          <input id="mov-qtd" type="number" min={1} step={1} className="input-pro num" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required autoFocus />
          <p className={`help-pro num ${novoSaldo < 0 ? "text-red-600" : ""}`}>
            Saldo após a movimentação: {novoSaldo}
            {novoSaldo < 0 ? " — estoque insuficiente" : ""}
          </p>
        </div>
        <div>
          <label className="label-pro" htmlFor="mov-motivo">Motivo</label>
          <input id="mov-motivo" className="input-pro" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: NF 1234 do fornecedor" required minLength={3} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sugestoes.map((s) => (
              <button key={s} type="button" className="chip !py-1" onClick={() => setMotivo(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Movimentacoes({ produtoId, produtoNome, onLimpar }) {
  const [pagina, setPagina] = useState(1);
  const [tipo, setTipo] = useState("");
  useEffect(() => setPagina(1), [produtoId, tipo]);
  const { data, isLoading } = useQuery({
    queryKey: ["produtos", "movimentacoes", produtoId, tipo, pagina],
    queryFn: async () => {
      const { data: r } = await api.get("/produtos/movimentacoes", {
        params: { produto_id: produtoId || undefined, tipo: tipo || undefined, page: pagina, limit: 25 },
      });
      return { rows: unwrapListResponse(r), pagination: unwrapPagination(r) };
    },
    placeholderData: (p) => p,
  });
  const rows = data?.rows ?? [];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterChips
          options={[
            { value: "", label: "Todas" },
            { value: "ENTRADA", label: "Entradas", dot: "bg-emerald-500" },
            { value: "SAIDA", label: "Saídas", dot: "bg-red-500" },
          ]}
          value={tipo}
          onChange={setTipo}
        />
        {produtoId && (
          <span className="chip chip-active">
            {produtoNome}
            <button type="button" onClick={onLimpar} aria-label="Remover filtro de peça" className="ml-1">
              ×
            </button>
          </span>
        )}
      </div>
      <div className="pro-card overflow-hidden">
        {isLoading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon={FiRepeat} title="Nenhuma movimentação" description="Entradas, saídas e baixas por OS aparecem aqui." />
        ) : (
          <table className="table-pro">
            <thead>
              <tr>
                <th>Data</th>
                <th>Peça</th>
                <th className="text-right">Qtd</th>
                <th className="hidden md:table-cell">Motivo</th>
                <th className="hidden sm:table-cell">OS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap num text-xs">{formatarDataHora(m.criado_em)}</td>
                  <td>
                    <p className="font-medium text-ink-900 dark:text-white">{m.produto_nome}</p>
                    <p className="text-2xs text-ink-500 font-mono">{m.produto_codigo}</p>
                    <p className="md:hidden text-xs text-ink-500">{m.motivo}</p>
                  </td>
                  <td className={`text-right font-semibold num whitespace-nowrap ${m.tipo === "ENTRADA" ? "text-emerald-600" : "text-red-600"}`}>
                    {m.tipo === "ENTRADA" ? "+" : "−"}
                    {m.quantidade}
                  </td>
                  <td className="hidden md:table-cell text-ink-600 dark:text-ink-300">{m.motivo || "—"}</td>
                  <td className="hidden sm:table-cell">
                    {m.os_id ? (
                      <Link to={`/ordens-servico/${m.os_id}`} className="link-pro num">
                        {m.os_numero || `#${m.os_id}`}
                      </Link>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={pagina}
          totalPages={data?.pagination?.pages ?? 1}
          onPageChange={setPagina}
          itemsPerPage={25}
          totalItems={data?.pagination?.total ?? 0}
        />
      </div>
    </>
  );
}

export default function Estoque() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const aba = searchParams.get("aba") || "pecas";
  const movProduto = searchParams.get("produto") || "";
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca);
  const [filtroEstoque, setFiltroEstoque] = useState(searchParams.get("filtro") || "todos");
  const [categoria, setCategoria] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [movimentar, setMovimentar] = useState(null);
  const [nomeFiltroMov, setNomeFiltroMov] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, produtoId: null });
  const { data: categorias = [] } = useCategorias("produtos");

  useEffect(() => {
    setCurrentPage(1);
  }, [buscaDebounced, filtroEstoque, categoria]);

  const listParams = useMemo(() => {
    const p = { page: currentPage, limit: ITEMS_PER_PAGE };
    if (buscaDebounced) p.busca = buscaDebounced;
    if (categoria) p.categoria = categoria;
    if (filtroEstoque === "baixo" || filtroEstoque === "zerado") p.estoque = filtroEstoque;
    return p;
  }, [currentPage, buscaDebounced, filtroEstoque, categoria]);

  const { data, isLoading, isError } = useProdutosPaginated(listParams);
  const contagens = useQueries({
    queries: ["", "baixo", "zerado"].map((e) => ({
      queryKey: ["produtos", "contagem", e],
      queryFn: async () => {
        const { data: r } = await api.get("/produtos", { params: { estoque: e || undefined, limit: 1, page: 1 } });
        return unwrapPagination(r)?.total ?? 0;
      },
      staleTime: 30_000,
    })),
  });

  const produtos = data?.rows ?? [];
  const totalItems = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.pages ?? 1;

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar produtos");
  }, [isError]);

  const setAba = (v, extra = {}) => {
    const next = new URLSearchParams(searchParams);
    next.set("aba", v);
    for (const [k, val] of Object.entries(extra)) val ? next.set(k, val) : next.delete(k);
    if (v === "pecas") next.delete("produto");
    setSearchParams(next, { replace: true });
  };

  const handleDeletar = async (id) => {
    try {
      await api.delete(`/produtos/${id}`);
      toast.success("Peça excluída.");
      setConfirmDialog({ isOpen: false, produtoId: null });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao excluir peça (ela pode estar vinculada a orçamentos ou OS).");
      setConfirmDialog({ isOpen: false, produtoId: null });
    }
  };

  const handleFecharForm = () => {
    setMostrarForm(false);
    setProdutoEditando(null);
    queryClient.invalidateQueries({ queryKey: ["produtos"] });
  };

  const mensagemListaVazia =
    totalItems === 0 && !buscaDebounced && filtroEstoque === "todos" && !categoria
      ? "Nenhuma peça cadastrada."
      : "Nenhuma peça corresponde à busca ou ao filtro.";

  return (
    <div className="page-enter">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, produtoId: null })}
        onConfirm={() => handleDeletar(confirmDialog.produtoId)}
        title="Excluir peça"
        message="Deseja realmente excluir esta peça do catálogo? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
      />

      <PageHeader
        title="Peças e estoque"
        subtitle="Catálogo de peças, saldos, alertas de mínimo e histórico de movimentações."
        actions={
          <button
            type="button"
            onClick={() => {
              setProdutoEditando(null);
              setMostrarForm(true);
            }}
            className="btn-brand"
          >
            <FiPlus className="h-4 w-4" />
            Nova peça
          </button>
        }
      />

      <div className="flex gap-1 border-b border-ink-200 dark:border-ink-800 mb-4" role="tablist">
        {[
          ["pecas", "Peças", FiPackage],
          ["movimentacoes", "Movimentações", FiClock],
        ].map(([v, l, Icon]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={aba === v}
            onClick={() => setAba(v)}
            className={`inline-flex items-center gap-2 px-3 py-2 -mb-px border-b-2 text-sm font-medium ${
              aba === v ? "border-brand-600 text-ink-900 dark:text-white" : "border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {l}
          </button>
        ))}
      </div>

      {aba === "movimentacoes" ? (
        <Movimentacoes produtoId={movProduto} produtoNome={nomeFiltroMov || "Peça selecionada"} onLimpar={() => setAba("movimentacoes", { produto: "" })} />
      ) : (
        <>
          <div className="space-y-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <FilterChips
                className="flex-1"
                options={[
                  { value: "todos", label: "Todas", count: contagens[0].data },
                  { value: "baixo", label: "Estoque baixo", count: contagens[1].data, dot: "bg-amber-500" },
                  { value: "zerado", label: "Zeradas", count: contagens[2].data, dot: "bg-red-500" },
                ]}
                value={filtroEstoque}
                onChange={setFiltroEstoque}
                ariaLabel="Filtrar por saldo"
              />
              {categorias.length > 0 && (
                <select className="input-pro sm:w-56" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
                  <option value="">Todas as categorias</option>
                  {categorias.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
            <SearchBar onSearch={setBusca} placeholder="Buscar peça por nome ou código…" />
          </div>

          <div className="pro-card overflow-hidden">
            {isLoading && !data ? (
              <SkeletonRows rows={6} cols={5} />
            ) : produtos.length === 0 ? (
              <EmptyState icon={FiPackage} title={mensagemListaVazia} />
            ) : (
              <table className="table-pro">
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th className="hidden lg:table-cell">Categoria</th>
                    <th className="text-right">Estoque</th>
                    <th className="hidden md:table-cell text-right">Custo</th>
                    <th className="hidden sm:table-cell text-right">Venda</th>
                    <th className="hidden xl:table-cell text-right">Margem</th>
                    <th className="text-right"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((produto) => {
                    const custo = Number(produto.valor_custo || 0);
                    const venda = Number(produto.valor_venda || 0);
                    const margem = venda > 0 && custo > 0 ? ((venda - custo) / venda) * 100 : null;
                    return (
                      <tr key={produto.id}>
                        <td className="max-w-[22rem]">
                          <p className="font-medium text-ink-900 dark:text-white truncate">{produto.nome}</p>
                          <p className="text-2xs text-ink-500">
                            <span className="font-mono">{produto.codigo}</span>
                            {produto.ncm ? ` · NCM ${produto.ncm}` : <span className="text-amber-600"> · sem NCM</span>}
                          </p>
                        </td>
                        <td className="hidden lg:table-cell">
                          {produto.categoria ? (
                            <span className="inline-flex rounded-md bg-ink-100 dark:bg-ink-800 px-2 py-0.5 text-xs">{produto.categoria}</span>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <NivelEstoque quantidade={produto.quantidade} minimo={produto.estoque_minimo} />
                        </td>
                        <td className="hidden md:table-cell text-right num">{formatarMoeda(custo)}</td>
                        <td className="hidden sm:table-cell text-right num font-medium text-ink-900 dark:text-ink-100">{formatarMoeda(venda)}</td>
                        <td className="hidden xl:table-cell text-right num text-ink-600 dark:text-ink-300">{margem != null ? `${margem.toFixed(0)}%` : "—"}</td>
                        <td className="text-right whitespace-nowrap">
                          <button type="button" onClick={() => setMovimentar(produto)} className="btn-ghost btn-sm" title="Entrada / saída">
                            <FiRepeat className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Movimentar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNomeFiltroMov(produto.nome);
                              setAba("movimentacoes", { produto: String(produto.id) });
                            }}
                            className="btn-ghost btn-sm !px-1.5 hidden sm:inline-flex"
                            title="Histórico de movimentações"
                            aria-label={`Histórico de ${produto.nome}`}
                          >
                            <FiClock className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProdutoEditando(produto);
                              setMostrarForm(true);
                            }}
                            className="btn-ghost btn-sm !px-1.5"
                            title="Editar"
                            aria-label={`Editar ${produto.nome}`}
                          >
                            <FiEdit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDialog({ isOpen: true, produtoId: produto.id })}
                            className="btn-ghost btn-sm !px-1.5 text-ink-400 hover:!text-red-600"
                            title="Excluir"
                            aria-label={`Excluir ${produto.nome}`}
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={totalItems} />
          </div>
        </>
      )}

      {mostrarForm && (
        <ProdutoFormModal isOpen={mostrarForm} produto={produtoEditando} produtosExistentes={produtos} onClose={handleFecharForm} onSaved={() => queryClient.invalidateQueries({ queryKey: ["produtos"] })} />
      )}
      {movimentar && (
        <MovimentarModal
          produto={movimentar}
          onClose={() => setMovimentar(null)}
          onSalvo={() => queryClient.invalidateQueries({ queryKey: ["produtos"] })}
        />
      )}
    </div>
  );
}
