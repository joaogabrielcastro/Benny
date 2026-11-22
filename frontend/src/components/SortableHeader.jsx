import { FiArrowUp, FiArrowDown } from "react-icons/fi";

export default function SortableHeader({ label, field, currentSort, onSort, className = "" }) {
  const isActive = currentSort.field === field;
  const direction = currentSort.direction;
  const alignRight = className.includes("text-right");

  const handleClick = () => {
    if (isActive) onSort(field, direction === "asc" ? "desc" : "asc");
    else onSort(field, "asc");
  };

  return (
    <th
      className={className}
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.06em] font-semibold hover:text-ink-900 dark:hover:text-white ${
          alignRight ? "flex-row-reverse" : ""
        } ${isActive ? "text-ink-900 dark:text-white" : ""}`}
      >
        {label}
        {isActive ? (
          direction === "asc" ? (
            <FiArrowUp className="h-3 w-3" />
          ) : (
            <FiArrowDown className="h-3 w-3" />
          )
        ) : (
          <FiArrowDown className="h-3 w-3 opacity-0 group-hover:opacity-40" />
        )}
      </button>
    </th>
  );
}
