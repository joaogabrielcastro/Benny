import { useState } from "react";

export default function AdvancedFilters({ onFilter, clientes = [] }) {
  const [filters, setFilters] = useState({
    dataInicio: "",
    dataFim: "",
    status: "",
    cliente: "",
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    onFilter(filters);
  };

  const handleClear = () => {
    const clearedFilters = {
      dataInicio: "",
      dataFim: "",
      status: "",
      cliente: "",
    };
    setFilters(clearedFilters);
    onFilter(clearedFilters);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Filtros Avançados
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          {showFilters ? "Ocultar ▲" : "Mostrar ▼"}
        </button>
      </div>

      {showFilters && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Início
              </label>
              <input
                type="date"
                name="dataInicio"
                value={filters.dataInicio}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                name="dataFim"
                value={filters.dataFim}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="Aberta">Aberta</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Finalizada">Finalizada</option>
                <option value="Cancelada">Cancelada</option>
                <option value="Pendente">Pendente</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Recusado">Recusado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cliente
              </label>
              <select
                name="cliente"
                value={filters.cliente}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
