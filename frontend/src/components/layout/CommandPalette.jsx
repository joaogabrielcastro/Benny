import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiSearch,
  FiTool,
  FiUser,
  FiTruck,
  FiCornerDownLeft,
  FiArrowRight,
  FiPlus,
} from "react-icons/fi";
import api from "../../services/api";
import { useDebounce } from "../../hooks/useDebounce";
import { useAuth } from "../../contexts/AuthContext";
import { unwrapListResponse } from "../../utils/apiList";
import { navItemsForRole } from "../../utils/roles";
import { useSubscription } from "../../hooks/useSubscription";
import { formatarMoeda } from "../../utils/formatters";
import StatusBadge from "../ui/StatusBadge";

async function buscarTudo(termo, isAdmin) {
  const reqs = [
    api
      .get("/ordens-servico", { params: { busca: termo, limit: 6, page: 1 } })
      .then((r) => unwrapListResponse(r.data))
      .catch(() => []),
  ];
  if (isAdmin) {
    reqs.push(
      api
        .get("/clientes", { params: { busca: termo, limit: 5, page: 1 } })
        .then((r) => unwrapListResponse(r.data))
        .catch(() => []),
      api
        .get("/veiculos", { params: { busca: termo, limit: 5, page: 1 } })
        .then((r) => unwrapListResponse(r.data))
        .catch(() => []),
    );
  }
  const [ordens = [], clientes = [], veiculos = []] = await Promise.all(reqs);
  return { ordens, clientes, veiculos };
}

/**
 * Busca global (Ctrl/⌘ + K): OS por número, placa ou cliente; clientes; veículos;
 * e atalhos para as páginas. Usa apenas endpoints existentes.
 */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { hasFeature } = useSubscription();
  const [termo, setTermo] = useState("");
  const [ativo, setAtivo] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const termoDeb = useDebounce(termo.trim(), 220);

  useEffect(() => {
    if (open) {
      setTermo("");
      setAtivo(0);
      inputRef.current?.focus();
    }
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["busca-global", termoDeb, isAdmin],
    queryFn: () => buscarTudo(termoDeb, isAdmin),
    enabled: open && termoDeb.length >= 2,
    staleTime: 15_000,
  });

  const itens = useMemo(() => {
    const out = [];
    const t = termo.trim().toLowerCase();
    if (isAdmin && (!t || "novo orçamento nova os abrir atendimento".includes(t))) {
      out.push({
        key: "acao-novo",
        group: "Ações",
        icon: FiPlus,
        title: "Novo orçamento / abrir atendimento",
        to: "/orcamentos/novo",
      });
    }
    if (termoDeb.length >= 2 && data) {
      for (const os of data.ordens) {
        out.push({
          key: `os-${os.id}`,
          group: "Ordens de serviço",
          icon: FiTool,
          title: `${os.numero} · ${os.cliente_nome || "—"}`,
          subtitle: [os.veiculo_placa, [os.veiculo_marca, os.veiculo_modelo].filter(Boolean).join(" ")]
            .filter(Boolean)
            .join(" · "),
          right: (
            <span className="flex items-center gap-2">
              <span className="text-xs text-ink-500 num">{formatarMoeda(os.valor_total)}</span>
              <StatusBadge kind="os" status={os.status} size="sm" />
            </span>
          ),
          to: `/ordens-servico/${os.id}`,
        });
      }
      for (const v of data.veiculos) {
        out.push({
          key: `v-${v.id}`,
          group: "Veículos",
          icon: FiTruck,
          title: `${v.placa} · ${[v.marca, v.modelo].filter(Boolean).join(" ")}`,
          subtitle: v.cliente_nome,
          to: `/clientes/${v.cliente_id}?veiculo=${v.id}`,
        });
      }
      for (const c of data.clientes) {
        out.push({
          key: `c-${c.id}`,
          group: "Clientes",
          icon: FiUser,
          title: c.nome,
          subtitle: [c.telefone, c.cpf_cnpj].filter(Boolean).join(" · "),
          to: `/clientes/${c.id}`,
        });
      }
    }
    const paginas = navItemsForRole(user?.role, { hasFeature }).filter(
      (n) => !t || n.label.toLowerCase().includes(t),
    );
    for (const n of paginas.slice(0, t ? 6 : 8)) {
      out.push({
        key: `nav-${n.to}`,
        group: "Ir para",
        icon: FiArrowRight,
        title: n.label,
        to: n.to,
      });
    }
    return out;
  }, [data, termo, termoDeb, isAdmin, user?.role, hasFeature]);

  useEffect(() => {
    setAtivo(0);
  }, [termoDeb, data]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${ativo}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [ativo]);

  if (!open) return null;

  const escolher = (item) => {
    if (!item) return;
    onClose();
    navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((a) => Math.min(a + 1, itens.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      escolher(itens[ativo]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  let ultimoGrupo = null;
  const semResultado =
    termoDeb.length >= 2 && !isFetching && data && itens.every((i) => i.group === "Ir para" || i.group === "Ações");

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-ink-950/40 backdrop-blur-[2px] p-3 sm:pt-[12vh] animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="w-full max-w-xl pro-card shadow-pop overflow-hidden animate-slide-up"
      >
        <div className="flex items-center gap-3 px-4 border-b border-ink-100 dark:border-ink-800">
          <FiSearch className="h-4 w-4 text-ink-400 shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isAdmin ? "Placa, cliente, nº da OS ou página…" : "Placa, cliente ou nº da OS…"}
            className="flex-1 bg-transparent py-3.5 text-[15px] text-ink-900 dark:text-white placeholder:text-ink-400 outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label="Buscar"
            role="combobox"
            aria-expanded="true"
            aria-controls="busca-global-lista"
          />
          {isFetching && <span className="h-3.5 w-3.5 rounded-full border-2 border-ink-300 border-t-brand-600 animate-spin" />}
          <span className="kbd hidden sm:inline-flex">Esc</span>
        </div>

        <ul id="busca-global-lista" ref={listRef} role="listbox" className="max-h-[60vh] overflow-y-auto py-2">
          {termo.trim().length === 1 && (
            <li className="px-4 py-2 text-xs text-ink-500">Digite ao menos 2 caracteres…</li>
          )}
          {semResultado && (
            <li className="px-4 py-3 text-sm text-ink-500">
              Nada encontrado para “{termoDeb}”.
            </li>
          )}
          {itens.map((item, idx) => {
            const header = item.group !== ultimoGrupo ? item.group : null;
            ultimoGrupo = item.group;
            const Icon = item.icon;
            return (
              <li key={item.key}>
                {header && <p className="eyebrow px-4 pt-2 pb-1">{header}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === ativo}
                  data-idx={idx}
                  onMouseMove={() => setAtivo(idx)}
                  onClick={() => escolher(item)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left ${
                    idx === ativo ? "bg-ink-100 dark:bg-ink-800" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 text-ink-400 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink-900 dark:text-white truncate">{item.title}</span>
                    {item.subtitle && (
                      <span className="block text-xs text-ink-500 truncate">{item.subtitle}</span>
                    )}
                  </span>
                  {item.right}
                  {idx === ativo && <FiCornerDownLeft className="h-3.5 w-3.5 text-ink-400 shrink-0 hidden sm:block" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
