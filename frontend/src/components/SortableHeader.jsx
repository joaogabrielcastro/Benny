import { FiChevronUp, FiChevronDown } from "react-icons/fi";

export default function SortableHeader({
  label,
  field,
  currentSort,
  onSort,
  className = "",
}) {
  const isActive = currentSort.field === field;
  const direction = currentSort.direction;

  const handleClick = () => {
    if (isActive) {
      // Se já está ordenando por este campo, inverte a direção
      onSort(field, direction === "asc" ? "desc" : "asc");
    } else {
      // Se não está ordenando por este campo, começa com ascendente
      onSort(field, "asc");
    }
  };

  return (
    <th
      onClick={handleClick}
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider 
                cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none ${className}`}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <span className="text-gray-400">
          {!isActive && (
            <div className="flex flex-col h-4 w-4 -space-y-1">
              <FiChevronUp className="h-2 w-4 opacity-50" />
              <FiChevronDown className="h-2 w-4 opacity-50" />
            </div>
          )}
          {isActive && direction === "asc" && (
            <FiChevronUp className="h-4 w-4 text-blue-500" />
          )}
          {isActive && direction === "desc" && (
            <FiChevronDown className="h-4 w-4 text-blue-500" />
          )}
        </span>
      </div>
    </th>
  );
}
