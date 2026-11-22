/**
 * Bloco de conteúdo com cabeçalho opcional e ações.
 */
export default function Section({
  title,
  description,
  icon: Icon,
  actions,
  children,
  padded = true,
  className = "",
  id,
}) {
  return (
    <section id={id} className={`pro-card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          <div className="min-w-0 flex items-center gap-2.5">
            {Icon && <Icon className="h-4 w-4 text-ink-400 shrink-0" aria-hidden />}
            <div className="min-w-0">
              {title && <h2 className="card-title truncate">{title}</h2>}
              {description && (
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={padded ? "p-4 sm:p-5" : ""}>{children}</div>
    </section>
  );
}

/** Par rótulo/valor para fichas de detalhe. */
export function KeyValue({ label, children, mono = false, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-xs text-ink-500 dark:text-ink-400">{label}</dt>
      <dd
        className={`mt-0.5 text-sm font-medium text-ink-900 dark:text-ink-100 break-words ${
          mono ? "font-mono text-[13px]" : ""
        }`}
      >
        {children === null || children === undefined || children === "" ? (
          <span className="text-ink-400 font-normal">—</span>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}
