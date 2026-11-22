import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

function pageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
  if (currentPage >= totalPages - 3)
    return [1, "…", ...Array.from({ length: 5 }, (_, i) => totalPages - 4 + i)];
  return [1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages];
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 10,
  totalItems = 0,
}) {
  if (totalPages <= 1) return null;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <nav
      className="flex items-center justify-between gap-3 px-4 py-3 border-t border-ink-100 dark:border-ink-800"
      aria-label="Paginação"
    >
      <p className="text-xs text-ink-500 dark:text-ink-400 num">
        <span className="hidden sm:inline">Mostrando </span>
        <span className="font-medium text-ink-700 dark:text-ink-200">
          {startItem}–{endItem}
        </span>{" "}
        de <span className="font-medium text-ink-700 dark:text-ink-200">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-ghost btn-sm !px-2"
          aria-label="Página anterior"
        >
          <FiChevronLeft className="h-4 w-4" />
          <span className="sm:hidden">Anterior</span>
        </button>
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers(currentPage, totalPages).map((page, i) =>
            page === "…" ? (
              <span key={`e${i}`} className="px-1.5 text-xs text-ink-400">
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? "page" : undefined}
                className={`min-w-[2rem] h-8 rounded-md text-xs font-medium num transition-colors ${
                  currentPage === page
                    ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                    : "text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800"
                }`}
              >
                {page}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-ghost btn-sm !px-2"
          aria-label="Próxima página"
        >
          <span className="sm:hidden">Próxima</span>
          <FiChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
