import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import Logo from "../components/Logo";

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
    <div className="space-y-8">
      {/* Header com gradiente e logo */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center gap-6">
          <Logo size="xl" className="animate-pulse" />
          <div>
            <h1 className="text-4xl font-bold mb-2">Benny's Motorsport</h1>
            <p className="text-blue-100 text-lg">Sistema de Gestão • Centro Automotivo</p>
          </div>
        </div>
      </div>

      {/* Cards de estatísticas modernos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="OS Abertas"
          value={stats.osAbertas}
          icon="🔧"
          gradient="from-blue-500 to-blue-700"
          link="/ordens-servico?status=Aberta"
        />
        <StatCard
          title="Orçamentos Pendentes"
          value={stats.orcamentosPendentes}
          icon="📋"
          gradient="from-amber-500 to-orange-600"
          link="/orcamentos?status=Pendente"
        />
        <StatCard
          title="Produtos Estoque Baixo"
          value={stats.estoqueBaixo}
          icon="⚠️"
          gradient="from-red-500 to-pink-600"
          link="/estoque"
        />
      </div>

      {/* Cards de ações com hover modernos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ActionCard
          title="Ver Dashboard"
          description="Relatórios e análises detalhadas"
          link="/dashboard"
          icon="📊"
          color="indigo"
        />
        <ActionCard
          title="Nova Ordem de Serviço"
          description="Criar uma nova OS para atendimento"
          link="/ordens-servico/nova"
          icon="🔧"
          color="blue"
        />
        <ActionCard
          title="Novo Orçamento"
          description="Criar um orçamento para o cliente"
          link="/orcamentos/novo"
          icon="💰"
          color="green"
        />
        <ActionCard
          title="Gerenciar Estoque"
          description="Visualizar e gerenciar produtos"
          link="/estoque"
          icon="📦"
          color="purple"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient, link }) {
  return (
    <Link
      to={link}
      className="block transform transition-all duration-300 hover:scale-105"
    >
      <div
        className={`bg-gradient-to-br ${gradient} text-white rounded-2xl shadow-xl p-6 hover:shadow-2xl`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold opacity-90">{title}</h3>
          <span className="text-3xl">{icon}</span>
        </div>
        <p className="text-5xl font-bold">{value}</p>
        <div className="mt-4 text-sm opacity-75">
          Clique para ver detalhes →
        </div>
      </div>
    </Link>
  );
}

function ActionCard({ title, description, link, icon, color }) {
  const colors = {
    indigo: "border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100",
    blue: "border-blue-200 hover:border-blue-400 hover:shadow-blue-100",
    green: "border-green-200 hover:border-green-400 hover:shadow-green-100",
    purple: "border-purple-200 hover:border-purple-400 hover:shadow-purple-100",
  };

  return (
    <Link
      to={link}
      className="block transform transition-all duration-300 hover:scale-105"
    >
      <div
        className={`bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all border-2 ${colors[color]}`}
      >
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}
