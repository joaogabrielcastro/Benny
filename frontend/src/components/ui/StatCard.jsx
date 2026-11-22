import { Link } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";

const ACCENTS = {
  brand: "text-brand-600 dark:text-brand-400",
  amber: "text-amber-600 dark:text-amber-400",
  green: "text-emerald-600 dark:text-emerald-400",
  red: "text-red-600 dark:text-red-400",
  violet: "text-violet-600 dark:text-violet-400",
  gray: "text-ink-500 dark:text-ink-400",
};

/**
 * Indicador numérico. Se `to` for informado vira atalho para a lista filtrada.
 */
export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "brand",
  to,
  loading = false,
  emphasis = false,
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-500 dark:text-ink-400 truncate">{label}</p>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${ACCENTS[accent]}`} aria-hidden />}
      </div>
      {loading ? (
        <div className="skeleton h-7 w-20 mt-2" />
      ) : (
        <p
          className={`mt-1.5 font-semibold tracking-tight num text-ink-900 dark:text-white ${
            emphasis ? "text-2xl sm:text-[1.75rem]" : "text-xl sm:text-2xl"
          }`}
        >
          {value}
        </p>
      )}
      {hint && (
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400 flex items-center gap-1 truncate">
          {hint}
          {to && <FiArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </p>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="pro-card-hover group block p-4">
        {body}
      </Link>
    );
  }
  return <div className="pro-card p-4">{body}</div>;
}
