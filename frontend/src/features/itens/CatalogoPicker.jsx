import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiSearch, FiPlus, FiPackage, FiTool } from "react-icons/fi";
import api from "../../services/api";
import { unwrapListResponse } from "../../utils/apiList";
import { useDebounce } from "../../hooks/useDebounce";
import { formatarMoeda } from "../../utils/formatters";

/**
 * Busca no catálogo (servidor) com teclado: ↑ ↓ Enter.
 * tipo: "produto" | "servico"
 */
export default function CatalogoPicker({ tipo, onSelecionar, onAvulso, placeholder, autoFocus = false }) {
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const ref = useRef(null);
  const termoDeb = useDebounce(termo.trim(), 200);
  const isProduto = tipo === "produto";
  const url = isProduto ? "/produtos" : "/servicos";

  const { data: itens = [], isFetching } = useQuery({
    queryKey: [isProduto ? "produtos" : "servicos", "picker", termoDeb],
    queryFn: async () => {
      const { data } = await api.get(url, { params: { busca: termoDeb || undefined, limit: 8, page: 1 } });
      return unwrapListResponse(data);
    },
    enabled: aberto,
    staleTime: 20_000,
  });

  useEffect(() => {
    setAtivo(0);
  }, [termoDeb]);

  useEffect(() => {
    if (!aberto) return undefined;
    const fn = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false);
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [aberto]);

  const escolher = (item) => {
    onSelecionar(item);
    setTermo("");
    setAtivo(0);
    setAberto(false);
  };

  const opcoes = [...itens, ...(onAvulso ? [{ __avulso: true }] : [])];

  const onKeyDown = (e) => {
    if (!aberto && (e.key === "ArrowDown" || e.key === "Enter")) {
      setAberto(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((a) => Math.min(a + 1, opcoes.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = opcoes[ativo];
      if (!o) return;
      if (o.__avulso) {
        onAvulso(termo.trim());
        setTermo("");
      } else escolher(o);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  };

  const Icon = isProduto ? FiPackage : FiTool;

  return (
    <div className="relative" ref={ref}>
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
      <input
        className="input-pro !pl-9"
        value={termo}
        autoFocus={autoFocus}
        onChange={(e) => {
          setTermo(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder || (isProduto ? "Adicionar peça: nome ou código…" : "Adicionar serviço: nome ou código…")}
        aria-label={placeholder || (isProduto ? "Buscar peça" : "Buscar serviço")}
        role="combobox"
        aria-expanded={aberto}
      />
      {aberto && (
        <ul className="absolute z-30 mt-1 w-full max-h-80 overflow-y-auto pro-card shadow-pop py-1" role="listbox">
          {isFetching && itens.length === 0 && <li className="px-3 py-2 text-xs text-ink-500">Buscando…</li>}
          {!isFetching && itens.length === 0 && (
            <li className="px-3 py-2 text-xs text-ink-500">
              {termoDeb ? `Nada encontrado para “${termoDeb}”.` : "Catálogo vazio."}
            </li>
          )}
          {opcoes.map((it, idx) =>
            it.__avulso ? (
              <li key="avulso" className="border-t border-ink-100 dark:border-ink-800 mt-1 pt-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === ativo}
                  onMouseMove={() => setAtivo(idx)}
                  onClick={() => {
                    onAvulso(termo.trim());
                    setTermo("");
                    setAberto(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-brand-700 dark:text-brand-300 ${idx === ativo ? "bg-ink-100 dark:bg-ink-800" : ""}`}
                >
                  <FiPlus className="h-4 w-4" />
                  {isProduto ? "Peça avulsa (sem cadastro)" : "Serviço avulso"}
                  {termo.trim() ? `: “${termo.trim()}”` : ""}
                </button>
              </li>
            ) : (
              <li key={it.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === ativo}
                  onMouseMove={() => setAtivo(idx)}
                  onClick={() => escolher(it)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left ${idx === ativo ? "bg-ink-100 dark:bg-ink-800" : ""}`}
                >
                  <Icon className="h-4 w-4 text-ink-400 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink-900 dark:text-white truncate">{it.nome}</span>
                    <span className="block text-2xs text-ink-500 truncate">
                      {it.codigo}
                      {it.categoria ? ` · ${it.categoria}` : ""}
                      {!isProduto && it.tempo_estimado_min ? ` · ~${it.tempo_estimado_min} min` : ""}
                    </span>
                  </span>
                  {isProduto && (
                    <span
                      className={`text-2xs num shrink-0 ${
                        Number(it.quantidade) <= 0
                          ? "text-red-600"
                          : Number(it.quantidade) <= Number(it.estoque_minimo)
                            ? "text-amber-600"
                            : "text-ink-500"
                      }`}
                    >
                      {Number(it.quantidade)} em estoque
                    </span>
                  )}
                  <span className="text-xs font-semibold num text-ink-900 dark:text-ink-100 shrink-0">
                    {formatarMoeda(isProduto ? it.valor_venda : it.valor_unitario)}
                  </span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
