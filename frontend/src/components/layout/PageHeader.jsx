import { Link } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";

/**
 * Cabeçalho padronizado das páginas internas.
 * `back` = { to, label } mostra um atalho de retorno acima do título.
 */
export default function PageHeader({ title, subtitle, actions, badge, back, eyebrow }) {
  return (
    <div className="mb-5 sm:mb-6 page-enter">
      {back && (
        <Link
          to={back.to}
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-900 dark:hover:text-white mb-2 -ml-0.5"
        >
          <FiChevronLeft className="h-3.5 w-3.5" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink-900 dark:text-white">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400 max-w-2xl">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 [&>*]:flex-1 sm:[&>*]:flex-none">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
