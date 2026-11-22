import { FiCheck, FiX } from "react-icons/fi";

/**
 * Linha do tempo das etapas do atendimento:
 * Aprovação → Aberta → Em andamento → Finalizada → Pagamento → Nota fiscal.
 * As duas últimas etapas só aparecem para quem tem acesso (admin).
 */
export default function OSStepper({ os, situacaoPagamento, notaAutorizada, mostrarFinanceiro = true }) {
  const cancelada = os.status === "Cancelada";
  const ordem = { Aberta: 1, "Em andamento": 2, Finalizada: 3 };
  const atual = ordem[os.status] ?? 1;

  const etapas = [
    { key: "aprovado", label: "Orçamento aprovado", done: true },
    { key: "aberta", label: "Aberta", done: atual >= 1, current: atual === 1 },
    { key: "andamento", label: "Em execução", done: atual >= 2, current: atual === 2 },
    { key: "finalizada", label: "Finalizada", done: atual >= 3, current: atual === 3 && !mostrarFinanceiro },
  ];
  if (mostrarFinanceiro) {
    etapas.push(
      {
        key: "pago",
        label: situacaoPagamento === "Parcial" ? "Pago parcialmente" : "Pagamento",
        done: situacaoPagamento === "Quitada",
        partial: situacaoPagamento === "Parcial",
        current: atual === 3 && situacaoPagamento !== "Quitada",
      },
      {
        key: "nf",
        label: "Nota fiscal",
        done: Boolean(notaAutorizada),
        current: atual === 3 && situacaoPagamento === "Quitada" && !notaAutorizada,
      },
    );
  }

  return (
    <ol className="flex items-start overflow-x-auto scrollbar-none -mx-1 px-1 pb-1" aria-label="Etapas da OS">
      {etapas.map((e, i) => {
        const done = !cancelada && e.done;
        const current = !cancelada && e.current && !e.done;
        const dot = cancelada && i > 0 && !e.done
          ? "border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-ink-300"
          : done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : current || e.partial
              ? "border-brand-500 bg-white dark:bg-ink-900 text-brand-600 ring-4 ring-brand-500/15"
              : "border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-ink-400";
        const proximaFeita = !cancelada && etapas[i + 1]?.done;
        return (
          <li key={e.key} className="relative flex-1 min-w-[5.5rem] flex flex-col items-center text-center">
            {i < etapas.length - 1 && (
              <span
                className={`absolute top-3 left-1/2 w-full h-0.5 ${
                  proximaFeita ? "bg-emerald-500" : "bg-ink-200 dark:bg-ink-700"
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-bold ${dot}`}
              aria-current={current ? "step" : undefined}
            >
              {done ? <FiCheck className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={`mt-1.5 text-[11px] leading-tight px-1 ${
                current ? "font-semibold text-ink-900 dark:text-white" : done ? "text-ink-700 dark:text-ink-300" : "text-ink-400"
              }`}
            >
              {e.label}
            </span>
          </li>
        );
      })}
      {cancelada && (
        <li className="flex-1 min-w-[5.5rem] flex flex-col items-center text-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-500 text-white">
            <FiX className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="mt-1.5 text-[11px] font-semibold text-ink-700 dark:text-ink-300">Cancelada</span>
        </li>
      )}
    </ol>
  );
}
