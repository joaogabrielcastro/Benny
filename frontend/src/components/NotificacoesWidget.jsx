import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { FiBell, FiX, FiCalendar, FiDollarSign } from "react-icons/fi";
import { formatarData } from "../utils/formatters";

export default function NotificacoesWidget() {
  const [lembretes, setLembretes] = useState([]);
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarLembretes();

    // Atualizar a cada 5 minutos
    const interval = setInterval(carregarLembretes, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const carregarLembretes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/lembretes/hoje");
      setLembretes(response.data);
    } catch (error) {
      console.error("Erro ao carregar lembretes:", error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLido = async (id) => {
    try {
      await api.put(`/lembretes/${id}/marcar-enviado`);
      setLembretes(lembretes.filter((l) => l.id !== id));
    } catch (error) {
      console.error("Erro ao marcar lembrete:", error);
    }
  };

  const getIcone = (tipo) => {
    switch (tipo) {
      case "agendamento":
        return <FiCalendar className="text-blue-600" />;
      case "conta_pagar":
        return <FiDollarSign className="text-red-600" />;
      default:
        return <FiBell className="text-gray-600" />;
    }
  };

  const getLink = (lembrete) => {
    switch (lembrete.tipo) {
      case "agendamento":
        return "/agendamentos";
      case "conta_pagar":
        return "/contas-pagar";
      default:
        return "#";
    }
  };

  if (lembretes.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Botão de notificação */}
      <button
        onClick={() => setMostrar(!mostrar)}
        className="relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
      >
        <FiBell className="text-2xl" />
        {lembretes.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
            {lembretes.length}
          </span>
        )}
      </button>

      {/* Painel de notificações */}
      {mostrar && (
        <div className="absolute bottom-16 right-0 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FiBell className="text-blue-600" />
              Lembretes de Hoje
            </h3>
            <button
              onClick={() => setMostrar(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <FiX />
            </button>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {lembretes.map((lembrete) => (
              <div
                key={lembrete.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcone(lembrete.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={getLink(lembrete)}
                      onClick={() => setMostrar(false)}
                      className="block"
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {lembrete.titulo}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {lembrete.mensagem}
                      </p>
                      {lembrete.descricao_referencia && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {lembrete.descricao_referencia}
                        </p>
                      )}
                    </Link>
                  </div>
                  <button
                    onClick={() => marcarComoLido(lembrete.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Marcar como lido"
                  >
                    <FiX />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {lembretes.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 text-center">
              <button
                onClick={() => {
                  lembretes.forEach((l) => marcarComoLido(l.id));
                  setMostrar(false);
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Marcar todos como lidos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
