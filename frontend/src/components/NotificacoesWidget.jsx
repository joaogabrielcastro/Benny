import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBell, FiX, FiCalendar, FiDollarSign, FiCheck } from "react-icons/fi";
import api from "../services/api";

const QK = ["lembretes", "hoje"];

const ICONES = {
  agendamento: { Icon: FiCalendar, cls: "text-brand-600 bg-brand-50 dark:bg-brand-950/50" },
  conta_pagar: { Icon: FiDollarSign, cls: "text-red-600 bg-red-50 dark:bg-red-950/50" },
};

function linkPara(tipo) {
  if (tipo === "agendamento") return "/agendamentos";
  if (tipo === "conta_pagar") return "/contas-pagar";
  return null;
}

/**
 * Sino de lembretes do dia (admin), exibido na barra superior.
 * Atualiza a cada 5 minutos.
 */
export default function NotificacoesWidget() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const { data: lembretes = [] } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data } = await api.get("/lembretes/hoje");
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!aberto) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    const onKey = (e) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  const marcarComoLido = async (ids) => {
    try {
      await Promise.all(ids.map((id) => api.put(`/lembretes/${id}/enviado`)));
    } catch {
      /* mantém na lista se falhar */
    }
    qc.invalidateQueries({ queryKey: QK });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="btn-ghost btn-icon relative"
        aria-label={`Lembretes de hoje${lembretes.length ? ` (${lembretes.length})` : ""}`}
        aria-expanded={aberto}
      >
        <FiBell className="h-[18px] w-[18px]" />
        {lembretes.length > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center num">
            {lembretes.length}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] pro-card shadow-pop z-50 animate-fade-in overflow-hidden">
          <div className="card-header !py-3">
            <h3 className="card-title">Lembretes de hoje</h3>
            {lembretes.length > 0 && (
              <button
                type="button"
                className="text-xs link-pro"
                onClick={() => marcarComoLido(lembretes.map((l) => l.id))}
              >
                Marcar todos como lidos
              </button>
            )}
          </div>
          {lembretes.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-500">
              <FiCheck className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
              Nenhum lembrete pendente.
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-ink-100 dark:divide-ink-800">
              {lembretes.map((l) => {
                const ic = ICONES[l.tipo] || { Icon: FiBell, cls: "text-ink-500 bg-ink-100 dark:bg-ink-800" };
                const to = linkPara(l.tipo);
                const conteudo = (
                  <>
                    <p className="text-sm font-medium text-ink-900 dark:text-white">{l.titulo}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{l.mensagem}</p>
                    {l.descricao_referencia && (
                      <p className="text-xs text-ink-400 mt-0.5">{l.descricao_referencia}</p>
                    )}
                  </>
                );
                return (
                  <li key={l.id} className="flex gap-3 px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-850">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ic.cls}`}>
                      <ic.Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      {to ? (
                        <Link to={to} onClick={() => setAberto(false)} className="block">
                          {conteudo}
                        </Link>
                      ) : (
                        conteudo
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => marcarComoLido([l.id])}
                      className="btn-ghost !min-h-0 !p-1 self-start"
                      title="Marcar como lido"
                      aria-label="Marcar como lido"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
