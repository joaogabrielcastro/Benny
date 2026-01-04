import { useEffect, useState } from "react";
import { FiClock, FiEdit, FiPlus } from "react-icons/fi";
import api from "../services/api";
import LoadingSpinner from "./LoadingSpinner";

export default function AuditHistory({ tipo, registroId }) {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    carregarHistorico();
  }, [tipo, registroId]);

  const carregarHistorico = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/auditoria/${tipo}/${registroId}`);
      setHistorico(response.data);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIconeAcao = (acao) => {
    switch (acao) {
      case "INSERT":
        return <FiPlus className="text-green-500" />;
      case "UPDATE":
        return <FiEdit className="text-blue-500" />;
      default:
        return <FiClock className="text-gray-500" />;
    }
  };

  const getTextoAcao = (acao) => {
    switch (acao) {
      case "INSERT":
        return "Criado";
      case "UPDATE":
        return "Atualizado";
      default:
        return acao;
    }
  };

  const getDiferencas = (anterior, novo) => {
    if (!anterior || !novo) return [];

    const diferencas = [];
    const campos = new Set([...Object.keys(anterior), ...Object.keys(novo)]);

    campos.forEach((campo) => {
      if (anterior[campo] !== novo[campo]) {
        diferencas.push({
          campo,
          antes: anterior[campo],
          depois: novo[campo],
        });
      }
    });

    return diferencas;
  };

  if (loading) return <LoadingSpinner />;

  if (historico.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhum histórico de alterações disponível
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Histórico de Alterações
      </h3>

      <div className="space-y-3">
        {historico.map((item) => {
          const isExpanded = expandedId === item.id;
          const diferencas = getDiferencas(
            item.dados_anteriores,
            item.dados_novos
          );

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="mt-1">{getIconeAcao(item.acao)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {getTextoAcao(item.acao)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatarData(item.criado_em)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Por: {item.usuario}
                  </div>
                  {diferencas.length > 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {diferencas.length}{" "}
                      {diferencas.length === 1
                        ? "campo alterado"
                        : "campos alterados"}
                    </div>
                  )}
                </div>
              </button>

              {isExpanded && diferencas.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="space-y-2">
                    {diferencas.map((diff, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {diff.campo}:
                        </div>
                        <div className="pl-4 space-y-1">
                          <div className="text-red-600 dark:text-red-400">
                            <span className="font-mono bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                              - {String(diff.antes)}
                            </span>
                          </div>
                          <div className="text-green-600 dark:text-green-400">
                            <span className="font-mono bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                              + {String(diff.depois)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
