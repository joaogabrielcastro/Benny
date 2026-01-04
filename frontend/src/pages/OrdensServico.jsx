import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { formatarMoeda } from "../utils/formatters";
import AdvancedFilters from "../components/AdvancedFilters";
import LoadingSpinner from "../components/LoadingSpinner";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import SortableHeader from "../components/SortableHeader";
import { exportOSListToPDF } from "../utils/pdfExport";

export default function OrdensServico() {
  const [ordens, setOrdens] = useState([]);
  const [ordensFiltered, setOrdensFiltered] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    field: "criado_em",
    direction: "desc",
  });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status) setFiltroStatus(status);
    carregarDados();
  }, [searchParams]);

  useEffect(() => {
    aplicarFiltros();
  }, [busca, filtroStatus, ordens, sortConfig]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [ordensRes, clientesRes] = await Promise.all([
        api.get("/ordens-servico"),
        api.get("/clientes"),
      ]);
      setOrdens(ordensRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = ordens;

    if (busca) {
      resultado = resultado.filter(
        (os) =>
          os.numero.toLowerCase().includes(busca.toLowerCase()) ||
          os.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
          os.veiculo_placa?.toLowerCase().includes(busca.toLowerCase()) ||
          os.veiculo_modelo?.toLowerCase().includes(busca.toLowerCase())
      );
    }

    if (filtroStatus) {
      resultado = resultado.filter((os) => os.status === filtroStatus);
    }

    // Aplicar ordenação
    resultado.sort((a, b) => {
      const { field, direction } = sortConfig;
      let aVal = a[field];
      let bVal = b[field];

      // Tratamento especial para datas
      if (field === "criado_em") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      // Tratamento para números
      if (field === "valor_total") {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setOrdensFiltered(resultado);
    setCurrentPage(1); // Reset para primeira página ao filtrar
  };

  const handleAdvancedFilter = (filters) => {
    let resultado = ordens;

    if (filters.dataInicio && filters.dataFim) {
      resultado = resultado.filter((os) => {
        const osDate = new Date(os.criado_em);
        return (
          osDate >= new Date(filters.dataInicio) &&
          osDate <= new Date(filters.dataFim + "T23:59:59")
        );
      });
    }

    if (filters.status) {
      resultado = resultado.filter((os) => os.status === filters.status);
      setFiltroStatus(filters.status);
    }

    if (filters.cliente) {
      resultado = resultado.filter(
        (os) => os.cliente_id === parseInt(filters.cliente)
      );
    }

    setOrdensFiltered(resultado);
    toast.success("Filtros aplicados com sucesso");
  };

  const handleExportPDF = () => {
    if (ordensFiltered.length === 0) {
      toast.error("Nenhuma ordem de serviço para exportar");
      return;
    }
    exportOSListToPDF(ordensFiltered);
    toast.success("PDF gerado com sucesso!");
  };

  const handleSort = (field, direction) => {
    setSortConfig({ field, direction });
  };

  const handleSearch = (term) => {
    setBusca(term);
  };

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = ordensFiltered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(ordensFiltered.length / itemsPerPage);

  if (loading) return <LoadingSpinner size="xl" />;

  const formatarData = (data) => {
    return new Date(data).toLocaleString("pt-BR");
  };

  const getStatusColor = (status) => {
    const colors = {
      Aberta: "bg-blue-100 text-blue-800",
      "Em andamento": "bg-yellow-100 text-yellow-800",
      Finalizada: "bg-green-100 text-green-800",
      Cancelada: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
          Ordens de Serviço
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            📄 Exportar PDF
          </button>
          <Link
            to="/ordens-servico/nova"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nova OS
          </Link>
        </div>
      </div>

      <AdvancedFilters onFilter={handleAdvancedFilter} clientes={clientes} />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Buscar por número, cliente, placa ou modelo..."
          />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="Aberta">Aberta</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Finalizada">Finalizada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <SortableHeader
                  label="Número"
                  field="numero"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Cliente"
                  field="cliente_nome"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Veículo
                </th>
                <SortableHeader
                  label="Valor Total"
                  field="valor_total"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Status"
                  field="status"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Data"
                  field="criado_em"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentItems.map((os) => (
                <tr
                  key={os.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                    {os.numero}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {os.cliente_nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {os.veiculo_modelo} - {os.veiculo_placa}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-200">
                    {formatarMoeda(os.valor_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        os.status
                      )}`}
                    >
                      {os.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {formatarData(os.criado_em)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      to={`/ordens-servico/${os.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Ver Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
              {currentItems.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nenhuma ordem de serviço encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={ordensFiltered.length}
        />
      </div>
    </div>
  );
}
