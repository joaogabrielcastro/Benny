import { useState, useEffect, useRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";

export default function SearchBar({
  onSearch,
  placeholder = "Buscar...",
  className = "",
  defaultValue = "",
  autoFocus = false,
}) {
  const [searchTerm, setSearchTerm] = useState(defaultValue);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const first = useRef(true);

  // Debounce para não disparar uma requisição a cada tecla
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!defaultValue) return undefined;
    }
    const timer = setTimeout(() => onSearchRef.current(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, defaultValue]);

  const handleClear = () => {
    setSearchTerm("");
    onSearchRef.current("");
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FiSearch className="h-4 w-4 text-ink-400" />
      </div>
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="input-pro !pl-9 !pr-9 [&::-webkit-search-cancel-button]:hidden"
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
      />
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
          aria-label="Limpar busca"
        >
          <FiX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
