import { useState, useEffect } from "react";
import { FiSearch, FiX } from "react-icons/fi";

export default function SearchBar({
  onSearch,
  placeholder = "Buscar...",
  className = "",
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce da busca para não fazer muitas requisições
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const handleClear = () => {
    setSearchTerm("");
    onSearch("");
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FiSearch className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="input-pro !pl-10 !pr-10"
        placeholder={placeholder}
      />
      {searchTerm && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <FiX className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
