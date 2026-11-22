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

// Mesmas cores do sistema de status (utils/statusColors)
const STATUS_COLORS = {
  Aberta: "#3c6ef1",
  "Em andamento": "#f59e0b",
  Finalizada: "#10b981",
  Cancelada: "#9aa2ae",
};
const GRID = "rgba(107,116,130,0.18)";
const TICK = { fontSize: 11, fill: "#6b7482" };

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

  const handleExportPDF = async () => {
    try {
      const { exportDashboardToPDF } = await import("../../utils/pdfExport");
      await exportDashboardToPDF(stats, chartData);
      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
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
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {osStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
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
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="mes" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(value) => formatarMoeda(value)} />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#2655dc"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
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
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="nome" tick={TICK} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} width={56} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#2655dc" name="Quantidade" radius={[4, 4, 0, 0]} maxBarSize={48} />
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
      <p className="text-xs font-medium text-ink-500 dark:text-ink-400">{label}</p>
      <p className="mt-1.5 text-xl sm:text-2xl font-semibold num text-ink-900 dark:text-white">{value}</p>
    </div>
  );
}
