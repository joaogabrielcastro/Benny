export function SkeletonRows({ rows = 5, cols = 4 }) {
  return (
    <div className="divide-y divide-ink-100 dark:divide-ink-800" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((__, c) => (
            <div
              key={c}
              className="skeleton h-3.5"
              style={{ width: c === 0 ? "18%" : c === 1 ? "32%" : `${12 + ((r + c) % 3) * 6}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pro-card p-4">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-7 w-16 mt-3" />
        </div>
      ))}
    </div>
  );
}
