import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { unwrapListResponse } from "../utils/apiList";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import StatCard from "../components/ui/StatCard";
import StatusBadge from "../components/ui/StatusBadge";
import FilterChips from "../components/ui/FilterChips";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import { statusContaPagar } from "../utils/statusColors";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Select from "../components/Select";
import { formatarMoeda, formatarData } from "../utils/formatters";
import {
  FiDollarSign,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiAlertCircle,
  FiCalendar,
  FiRepeat,
} from "react-icons/fi";

export default function ContasPagar() {
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState([]);
  const [alertas, setAlertas] = useState({ vencidas: [], aVencer: [] });
  const [searchParams] = useSearchParams();
  const { confirm: confirmar, dialogState, handleClose } = useConfirm();
  const [filtros, setFiltros] = useState({
    status: searchParams.get("status") || "",
    data_inicio: "",
    data_fim: "",
    categoria: "",
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [contaEditando, setContaEditando] = useState(null);

  useEffect(() => {
    carregarDados();
  }, [filtros]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filtros.status) params.append("status", filtros.status);
      if (filtros.data_inicio)
        params.append("data_inicio", filtros.data_inicio);
      if (filtros.data_fim) params.append("data_fim", filtros.data_fim);
      if (filtros.categoria) params.append("categoria", filtros.categoria);

      params.append("limit", "500");
      const [contasRes, alertasRes] = await Promise.all([
        api.get(`/contas-pagar?${params}`),
        api.get("/contas-pagar/alertas/resumo"),
      ]);

      setContas(unwrapListResponse(contasRes.data));
      setAlertas(alertasRes.data);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
      toast.error("Erro ao carregar contas a pagar");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setContaEditando(null);
    setModalAberto(true);
  };

  const abrirModalEditar = (conta) => {
    setContaEditando(conta);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setContaEditando(null);
  };

  const handleSalvar = async () => {
    await carregarDados();
    fecharModal();
  };

  const handleDeletar = async (id) => {
    const ok = await confirmar({
      title: "Excluir conta",
      message: "Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
    });
    if (!ok) return;

    try {
      await api.delete(`/contas-pagar/${id}`);
      toast.success("Conta deletada com sucesso!");
      carregarDados();
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      toast.error("Erro ao deletar conta");
    }
  };

  const handleMarcarPago = async (conta) => {
    try {
      await api.put(`/contas-pagar/${conta.id}`, {
        status: "Pago",
        data_pagamento: new Date().toISOString().split("T")[0],
      });
      toast.success("Conta marcada como paga!");
      carregarDados();
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao atualizar conta");
    }
  };

  const calcularTotais = () => {
    const total = contas.reduce((sum, c) => sum + Number(c.valor), 0);
    const pagas = contas
      .filter((c) => c.status === "Pago")
      .reduce((sum, c) => sum + Number(c.valor), 0);
    const pendentes = contas
      .filter((c) => c.status === "Pendente")
      .reduce((sum, c) => sum + Number(c.valor), 0);

    return { total, pagas, pendentes };
  };

  const totais = calcularTotais();

  const CATEGORIAS = ["Fornecedor", "Aluguel", "Energia", "Água", "Internet", "Salários", "Impostos", "Outras"];
  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));

  return (
    <div className="page-enter">
      <PageHeader
        title="Contas a pagar"
        subtitle="Despesas da oficina, vencimentos e contas recorrentes."
        actions={
          <button type="button" onClick={abrirModalNovo} className="btn-brand">
            <FiPlus className="h-4 w-4" />
            Nova conta
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total listado" value={formatarMoeda(totais.total)} icon={FiDollarSign} accent="brand" loading={loading} />
        <StatCard label="Pagas" value={formatarMoeda(totais.pagas)} icon={FiCheck} accent="green" loading={loading} />
        <StatCard label="Pendentes" value={formatarMoeda(totais.pendentes)} icon={FiCalendar} accent="amber" loading={loading} />
        <StatCard
          label="Vencidas"
          value={alertas.vencidas.length}
          hint={alertas.aVencer.length ? `${alertas.aVencer.length} vencem em 7 dias` : "Nenhuma a vencer em 7 dias"}
          icon={FiAlertCircle}
          accent={alertas.vencidas.length ? "red" : "gray"}
          loading={loading}
        />
      </div>

      <div className="space-y-3 mb-4">
        <FilterChips
          options={[
            { value: "", label: "Todas" },
            { value: "Pendente", label: "Pendentes", dot: "bg-amber-500" },
            { value: "Vencida", label: "Vencidas", dot: "bg-red-500" },
            { value: "Pago", label: "Pagas", dot: "bg-emerald-500" },
            { value: "Cancelado", label: "Canceladas", dot: "bg-ink-400" },
          ]}
          value={filtros.status}
          onChange={(v) => set("status", v)}
          ariaLabel="Status"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select className="input-pro" value={filtros.categoria} onChange={(e) => set("categoria", e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input type="date" className="input-pro" value={filtros.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} aria-label="Vencimento a partir de" title="Vencimento a partir de" />
          <input type="date" className="input-pro" value={filtros.data_fim} onChange={(e) => set("data_fim", e.target.value)} aria-label="Vencimento até" title="Vencimento até" />
        </div>
      </div>

      <div className="pro-card overflow-hidden">
        {loading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : contas.length === 0 ? (
          <EmptyState
            icon={FiDollarSign}
            title="Nenhuma conta"
            description="Cadastre despesas para acompanhar vencimentos e o fluxo de caixa."
            action={
              <button type="button" onClick={abrirModalNovo} className="btn-brand">
                <FiPlus className="h-4 w-4" /> Nova conta
              </button>
            }
          />
        ) : (
          <table className="table-pro">
            <thead>
              <tr>
                <th>Conta</th>
                <th className="hidden md:table-cell">Categoria</th>
                <th>Vencimento</th>
                <th className="text-right">Valor</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="text-right"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {contas.map((conta) => {
                const st = statusContaPagar(conta);
                return (
                  <tr key={conta.id} className={st === "Vencida" ? "!bg-red-50/50 dark:!bg-red-950/20" : ""}>
                    <td className="max-w-[20rem]">
                      <p className="font-medium text-ink-900 dark:text-white truncate">
                        {conta.descricao}
                        {conta.recorrente && <FiRepeat className="inline h-3 w-3 ml-1.5 text-ink-400" title="Recorrente" />}
                      </p>
                      <p className="text-xs text-ink-500 truncate">
                        {[conta.fornecedor, conta.observacoes].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <div className="sm:hidden mt-1"><StatusBadge kind="conta" status={st} size="sm" /></div>
                    </td>
                    <td className="hidden md:table-cell">{conta.categoria}</td>
                    <td className="whitespace-nowrap num">
                      {formatarData(conta.data_vencimento)}
                      {conta.data_pagamento && <span className="block text-2xs text-ink-500">pago {formatarData(conta.data_pagamento)}</span>}
                    </td>
                    <td className="text-right font-semibold num text-ink-900 dark:text-ink-100 whitespace-nowrap">{formatarMoeda(conta.valor)}</td>
                    <td className="hidden sm:table-cell"><StatusBadge kind="conta" status={st} size="sm" /></td>
                    <td className="text-right whitespace-nowrap">
                      {conta.status === "Pendente" && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => handleMarcarPago(conta)} title="Marcar como paga hoje">
                          <FiCheck className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline">Pagar</span>
                        </button>
                      )}
                      <button type="button" className="btn-ghost btn-sm !px-1.5" onClick={() => abrirModalEditar(conta)} aria-label="Editar" title="Editar">
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="btn-ghost btn-sm !px-1.5 text-ink-400 hover:!text-red-600" onClick={() => handleDeletar(conta.id)} aria-label="Excluir" title="Excluir">
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalAberto && <ContaModal conta={contaEditando} onClose={fecharModal} onSalvar={handleSalvar} />}

      <ConfirmDialog
        open={!!dialogState}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        cancelLabel={dialogState?.cancelLabel}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />
    </div>
  );
}

// Componente Modal de Conta
function ContaModal({ conta, onClose, onSalvar }) {
  const [formData, setFormData] = useState({
    descricao: conta?.descricao || "",
    categoria: conta?.categoria || "Fornecedor",
    valor: conta?.valor || "",
    data_vencimento: conta?.data_vencimento || "",
    fornecedor: conta?.fornecedor || "",
    observacoes: conta?.observacoes || "",
    // Campos de recorrência
    recorrente: conta?.recorrente || false,
    frequencia: conta?.frequencia || "mensal",
    intervalo: conta?.intervalo || 1,
    data_termino: conta?.data_termino || "",
  });
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);

    try {
      if (conta) {
        await api.put(`/contas-pagar/${conta.id}`, formData);
        toast.success("Conta atualizada com sucesso!");
      } else {
        await api.post("/contas-pagar", formData);
        toast.success("Conta criada com sucesso!");
      }
      onSalvar();
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      toast.error(error.response?.data?.error || "Erro ao salvar conta");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={conta ? "Editar Conta" : "Nova Conta a Pagar"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Descrição"
          required
          value={formData.descricao}
          onChange={(e) =>
            setFormData({ ...formData, descricao: e.target.value })
          }
          placeholder="Ex: Fornecedor XYZ, Aluguel Janeiro..."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Categoria"
            required
            value={formData.categoria}
            onChange={(e) =>
              setFormData({ ...formData, categoria: e.target.value })
            }
          >
            <option value="">Selecione...</option>
            <option value="Fornecedor">Fornecedor</option>
            <option value="Aluguel">Aluguel</option>
            <option value="Energia">Energia</option>
            <option value="Água">Água</option>
            <option value="Internet">Internet</option>
            <option value="Salários">Salários</option>
            <option value="Impostos">Impostos</option>
            <option value="Outras">Outras</option>
          </Select>

          <Input
            label="Valor"
            type="number"
            step="0.01"
            required
            value={formData.valor}
            onChange={(e) =>
              setFormData({ ...formData, valor: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data de Vencimento"
            type="date"
            required
            value={formData.data_vencimento}
            onChange={(e) =>
              setFormData({ ...formData, data_vencimento: e.target.value })
            }
          />

          <Input
            label="Fornecedor (opcional)"
            value={formData.fornecedor}
            onChange={(e) =>
              setFormData({ ...formData, fornecedor: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Observações
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            rows="3"
            value={formData.observacoes}
            onChange={(e) =>
              setFormData({ ...formData, observacoes: e.target.value })
            }
            placeholder="Observações sobre a conta..."
          />
        </div>

        {/* Recorrência */}
        <div className="border-t pt-4">
          <div className="mt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="flex items-center justify-center h-5 w-5 rounded border border-gray-400 bg-gray-800">
                <input
                  id="recorrente"
                  type="checkbox"
                  checked={!!formData.recorrente}
                  onChange={(e) =>
                    setFormData({ ...formData, recorrente: e.target.checked })
                  }
                  className="opacity-0 absolute"
                />
                {formData.recorrente && (
                  <svg
                    className="h-4 w-4 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>

              <div>
                <div className="font-medium">Tornar esta conta recorrente</div>
                <div className="text-xs text-gray-400">
                  Gere cópias automáticas desta conta conforme frequência
                  escolhida.
                </div>
              </div>
            </label>

            {formData.recorrente && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Frequência"
                  value={formData.frequencia}
                  onChange={(e) =>
                    setFormData({ ...formData, frequencia: e.target.value })
                  }
                >
                  <option value="mensal">Mensal</option>
                  <option value="semanal">Semanal</option>
                  <option value="diario">Diário</option>
                  <option value="anual">Anual</option>
                </Select>

                <Input
                  label="Intervalo"
                  type="number"
                  min="1"
                  value={formData.intervalo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      intervalo: Number(e.target.value),
                    })
                  }
                />

                <Input
                  label="Data de Término (opcional)"
                  type="date"
                  value={formData.data_termino}
                  onChange={(e) =>
                    setFormData({ ...formData, data_termino: e.target.value })
                  }
                />
              </div>
            )}

            {formData.recorrente && (
              <div className="mt-2 text-xs text-gray-400">
                Exemplo: "Mensal, Intervalo = 1" = todo mês; "Mensal, Intervalo
                = 2" = a cada 2 meses. Para semanal, intervalo = 2 = a cada 2
                semanas.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando} className="w-full sm:w-auto">
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
