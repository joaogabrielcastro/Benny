import { lazy, Suspense, useEffect } from "react";
import toast from "react-hot-toast";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import { useDashboardData } from "../hooks/queries/useDashboard";

const DashboardCharts = lazy(
  () => import("../features/dashboard/DashboardCharts"),
);

export default function Relatorios() {
  const { data, isLoading, isError } = useDashboardData();

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar os relatórios");
  }, [isError]);

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores de faturamento, ordens de serviço e desempenho do estoque."
      />

      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <Suspense fallback={<LoadingSpinner size="lg" />}>
          <DashboardCharts relatorio={data?.relatorio} />
        </Suspense>
      )}
    </div>
  );
}
