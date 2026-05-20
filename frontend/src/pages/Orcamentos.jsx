import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import { useOrcamentosList } from "../hooks/queries/useOrcamentosList";
import { formatarMoeda } from "../utils/formatters";

export default function Orcamentos() {
  const queryClient = useQueryClient();
  const { confirm, dialogState, handleClose } = useConfirm();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status) setFiltroStatus(status);
  }, [searchParams]);

  const listParams = useMemo(() => {
    const p = { limit: 500 };
    if (busca) p.busca = busca;
    if (filtroStatus) p.status = filtroStatus;
    return p;
  }, [busca, filtroStatus]);

  const {
    data: orcamentos = [],
    isError,
    refetch,
  } = useOrcamentosList(listParams);

  useEffect(() => {
    if (isError) toast.error("Erro ao carregar orçamentos");
  }, [isError]);

  const handleExcluirOrcamento = async (orc) => {
    const msg = `Excluir o orçamento ${orc.numero}?\n\nSe houver OS gerada a partir dele, será preciso excluir a OS primeiro. Movimentações de estoque do orçamento aprovado serão desfeitas.`;
    const ok = await confirm({
      title: "Excluir orçamento",
      message: msg,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    try {
      await api.delete(`/orcamentos/${orc.id}`);
      toast.success("Orçamento excluído.");
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      refetch();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.erro ||
          "Erro ao excluir orçamento",
      );
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleString("pt-BR");
  };

  const getStatusColor = (status) => {
    const colors = {
      Pendente: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      Aprovado: "bg-green-100 text-green-800 border border-green-300",
      Reprovado: "bg-red-100 text-red-800 border border-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border border-gray-300";
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          Orçamentos
        </h1>
        <Link
          to="/orcamentos/novo"
          className="w-full sm:w-auto text-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Novo Orçamento
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por número, cliente ou placa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Reprovado">Reprovado</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Veículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {orcamentos.map((orc) => (
                <tr
                  key={orc.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {orc.numero}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {orc.cliente_nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {orc.veiculo_modelo} - {orc.veiculo_placa}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                    {formatarMoeda(orc.valor_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        orc.status
                      )}`}
                    >
                      {orc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {formatarData(orc.criado_em)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={`/orcamentos/${orc.id}`}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Ver Detalhes
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleExcluirOrcamento(orc)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orcamentos.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nenhum orçamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {orcamentos.map((orc) => (
            <div key={orc.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Número</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {orc.numero}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                    orc.status,
                  )}`}
                >
                  {orc.status}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {orc.cliente_nome}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Veículo</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {orc.veiculo_modelo} - {orc.veiculo_placa}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Valor</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatarMoeda(orc.valor_total)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Data</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {formatarData(orc.criado_em)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to={`/orcamentos/${orc.id}`}
                  className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Ver Detalhes
                </Link>
                <button
                  type="button"
                  onClick={() => handleExcluirOrcamento(orc)}
                  className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {orcamentos.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              Nenhum orçamento encontrado
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!dialogState}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        cancelLabel={dialogState?.cancelLabel}
        onCancel={() => handleClose(false)}
        onConfirm={() => handleClose(true)}
      />
    </div>
  );
}
