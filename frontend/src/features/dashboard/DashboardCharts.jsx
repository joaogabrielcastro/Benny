import toast from "react-hot-toast";
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
import { formatarMoeda } from "../../utils/formatters";
import { exportDashboardToPDF } from "../../utils/pdfExport";

const STATUS_COLORS = {
  Aberta: "#3B82F6",
  "Em andamento": "#EAB308",
  Finalizada: "#10B981",
  Cancelada: "#EF4444",
};

export default function DashboardCharts({ relatorio }) {
  if (!relatorio) return null;

  const osStatus =
    relatorio.osPorStatus?.map((s) => ({
      name: s.status,
      value: s.total,
      color: STATUS_COLORS[s.status] || "#94A3B8",
    })) ?? [];

  const stats = {
    osAbertas: relatorio.osAbertas ?? 0,
    faturamentoMes: relatorio.faturamentoMes ?? 0,
    ticketMedio: relatorio.ticketMedio ?? 0,
    estoqueBaixo: relatorio.estoqueBaixo ?? 0,
  };

  const chartData = {
    osStatus,
    faturamentoMensal: relatorio.faturamentoMensal ?? [],
    produtosMaisVendidos: relatorio.produtosMaisVendidos ?? [],
  };

  const handleExportPDF = () => {
    exportDashboardToPDF(stats, chartData);
    toast.success("PDF gerado com sucesso!");
  };

  return (
    <section id="relatorios" className="space-y-6 scroll-mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Relatórios e indicadores
        </h2>
        <button type="button" onClick={handleExportPDF} className="btn-secondary">
          Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Faturamento do mês" value={formatarMoeda(stats.faturamentoMes)} />
        <MetricCard label="Ticket médio" value={formatarMoeda(stats.ticketMedio)} />
        <MetricCard label="OS abertas" value={String(stats.osAbertas)} />
        <MetricCard label="Itens estoque baixo" value={String(stats.estoqueBaixo)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="pro-card p-4 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            OS por status
          </h3>
          <div className="h-[260px]">
            {osStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={osStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {osStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-16">Sem dados</p>
            )}
          </div>
        </div>

        <div className="pro-card p-4 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Faturamento (6 meses)
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.faturamentoMensal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => formatarMoeda(value)} />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Faturamento"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pro-card p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Produtos mais vendidos (3 meses)
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.produtosMaisVendidos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#2563eb" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="pro-card p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
