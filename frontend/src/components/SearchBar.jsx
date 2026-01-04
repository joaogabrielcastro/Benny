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
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                 placeholder-gray-400 dark:placeholder-gray-500"
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
