import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatarMoeda } from "../utils/formatters";
import { exportDashboardToPDF } from "../utils/pdfExport";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOS: 0,
    osAbertas: 0,
    osFechadas: 0,
    totalOrcamentos: 0,
    orcamentosPendentes: 0,
    estoqueBaixo: 0,
    faturamentoMes: 0,
    ticketMedio: 0,
  });
  const [chartData, setChartData] = useState({
    osStatus: [],
    faturamentoMensal: [],
    produtosMaisVendidos: [],
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [osRes, orcRes, estRes, relatorioRes] = await Promise.all([
        api.get("/ordens-servico"),
        api.get("/orcamentos"),
        api.get("/produtos/alertas/estoque-baixo"),
        api.get("/relatorios/dashboard"),
      ]);

      const osAbertas = osRes.data.filter((os) => os.status === "Aberta");
      const osFechadas = osRes.data.filter((os) => os.status === "Finalizada");
      const orcPendentes = orcRes.data.filter(
        (orc) => orc.status === "Pendente"
      );

      setStats({
        totalOS: osRes.data.length,
        osAbertas: osAbertas.length,
        osFechadas: osFechadas.length,
        totalOrcamentos: orcRes.data.length,
        orcamentosPendentes: orcPendentes.length,
        estoqueBaixo: estRes.data.length,
        faturamentoMes: relatorioRes.data.faturamentoMes || 0,
        ticketMedio: relatorioRes.data.ticketMedio || 0,
      });

      setChartData({
        osStatus: [
          { name: "Abertas", value: osAbertas.length, color: "#3B82F6" },
          { name: "Fechadas", value: osFechadas.length, color: "#10B981" },
        ],
        faturamentoMensal: relatorioRes.data.faturamentoMensal || [],
        produtosMaisVendidos: relatorioRes.data.produtosMaisVendidos || [],
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    exportDashboardToPDF(stats, chartData);
    toast.success("PDF gerado com sucesso!");
  };

  if (loading) return <LoadingSpinner size="xl" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <button
          onClick={handleExportPDF}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          📄 Exportar PDF
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="OS Abertas"
          value={stats.osAbertas}
          total={stats.totalOS}
          icon="🔧"
          color="blue"
        />
        <StatCard
          title="Faturamento Mês"
          value={formatarMoeda(stats.faturamentoMes)}
          icon="💰"
          color="green"
        />
        <StatCard
          title="Ticket Médio"
          value={formatarMoeda(stats.ticketMedio)}
          icon="📊"
          color="purple"
        />
        <StatCard
          title="Estoque Baixo"
          value={stats.estoqueBaixo}
          icon="⚠️"
          color="red"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de OS por Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Ordens de Serviço
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.osStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.osStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Faturamento */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Faturamento (Últimos 6 meses)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.faturamentoMensal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value) => formatarMoeda(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Faturamento"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Produtos Mais Vendidos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Produtos Mais Vendidos
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.produtosMaisVendidos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="quantidade"
                fill="#8B5CF6"
                name="Quantidade Vendida"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Links Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/ordens-servico"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Ver Todas as OS
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {stats.totalOS} ordens de serviço registradas
          </p>
        </Link>
        <Link
          to="/orcamentos"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Ver Orçamentos
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {stats.orcamentosPendentes} orçamentos pendentes
          </p>
        </Link>
        <Link
          to="/estoque"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Gerenciar Estoque
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {stats.estoqueBaixo} produtos com estoque baixo
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ title, value, total, icon, color }) {
  const colors = {
    blue: "from-blue-500 to-blue-700",
    green: "from-green-500 to-green-700",
    purple: "from-purple-500 to-purple-700",
    red: "from-red-500 to-red-700",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colors[color]} rounded-lg shadow-lg p-6 text-white`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        {total && <span className="text-sm opacity-80">de {total}</span>}
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
