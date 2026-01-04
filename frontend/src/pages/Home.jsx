import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";

export default function Home() {
  const [stats, setStats] = useState({
    osAbertas: 0,
    orcamentosPendentes: 0,
    estoqueBaixo: 0,
  });

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async () => {
    try {
      const [osRes, orcRes, estRes] = await Promise.all([
        api.get("/ordens-servico?status=Aberta"),
        api.get("/orcamentos?status=Pendente"),
        api.get("/produtos/alertas/estoque-baixo"),
      ]);

      setStats({
        osAbertas: osRes.data.length,
        orcamentosPendentes: orcRes.data.length,
        estoqueBaixo: estRes.data.length,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header profissional */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Benny's Motorsport
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sistema de Gestão • Centro Automotivo
        </p>
      </div>

      {/* Cards de estatísticas clean */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="OS Abertas"
          value={stats.osAbertas}
          link="/ordens-servico?status=Aberta"
          color="blue"
        />
        <StatCard
          title="Orçamentos Pendentes"
          value={stats.orcamentosPendentes}
          link="/orcamentos?status=Pendente"
          color="orange"
        />
        <StatCard
          title="Estoque Baixo"
          value={stats.estoqueBaixo}
          link="/estoque"
          color="red"
        />
      </div>

      {/* Cards de ações profissionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionCard
          title="Ver Dashboard"
          description="Relatórios e análises"
          link="/dashboard"
          color="indigo"
        />
        <ActionCard
          title="Nova OS"
          description="Criar ordem de serviço"
          link="/ordens-servico/nova"
          color="blue"
        />
        <ActionCard
          title="Novo Orçamento"
          description="Criar orçamento"
          link="/orcamentos/novo"
          color="green"
        />
        <ActionCard
          title="Gerenciar Estoque"
          description="Produtos e inventário"
          link="/estoque"
          color="purple"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, link, color }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600",
    orange:
      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600",
  };

  const textColors = {
    blue: "text-blue-600 dark:text-blue-400",
    orange: "text-orange-600 dark:text-orange-400",
    red: "text-red-600 dark:text-red-400",
  };

  return (
    <Link
      to={link}
      className="block transition-all duration-200 hover:-translate-y-1"
    >
      <div
        className={`${colors[color]} border rounded-lg p-6 hover:shadow-md transition-all`}
      >
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          {title}
        </h3>
        <p className={`text-4xl font-bold ${textColors[color]}`}>{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Clique para ver detalhes →
        </p>
      </div>
    </Link>
  );
}

function ActionCard({ title, description, link, color }) {
  const colors = {
    indigo:
      "border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-indigo-100 dark:hover:shadow-indigo-900/50",
    blue: "border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-blue-100 dark:hover:shadow-blue-900/50",
    green:
      "border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:shadow-green-100 dark:hover:shadow-green-900/50",
    purple:
      "border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-purple-100 dark:hover:shadow-purple-900/50",
  };

  return (
    <Link
      to={link}
      className="block transition-all duration-200 hover:-translate-y-1"
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${colors[color]} p-6 hover:shadow-md transition-all`}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
    </Link>
  );
}
