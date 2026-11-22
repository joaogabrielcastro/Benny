/**
 * Filtro rápido em "chips" com contador opcional. Rola horizontalmente no mobile.
 * @param {{options: {value: string, label: string, count?: number, dot?: string}[], value: string, onChange: (v: string) => void}} props
 */
export default function FilterChips({ options, value, onChange, className = "", ariaLabel = "Filtro" }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 ${className}`}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || "all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`chip ${active ? "chip-active" : ""}`}
          >
            {opt.dot && <span className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} aria-hidden />}
            {opt.label}
            {typeof opt.count === "number" && (
              <span
                className={`num rounded-full px-1.5 text-2xs ${
                  active ? "bg-white/20 dark:bg-ink-900/15" : "bg-ink-100 dark:bg-ink-800"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
