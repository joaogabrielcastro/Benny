import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { unwrapListResponse } from "../utils/apiList";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/layout/PageHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirm } from "../hooks/useConfirm";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Select from "../components/Select";
import { rotuloVeiculo } from "../features/veiculos/rotuloVeiculo";
import ClienteAutocomplete from "../components/ClienteAutocomplete";
import { formatarData, formatarMoeda } from "../utils/formatters";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import {
  FiCalendar,
  FiClock,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiPlay,
} from "react-icons/fi";

function agruparPorDia(lista) {
  const mapa = new Map();
  for (const a of lista) {
    const dia = String(a.data_agendamento || "").slice(0, 10);
    if (!mapa.has(dia)) mapa.set(dia, []);
    mapa.get(dia).push(a);
  }
  return [...mapa.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([dia, itens]) => [dia, itens.sort((p, q) => String(p.hora_inicio).localeCompare(String(q.hora_inicio)))]);
}

function rotuloDia(diaIso) {
  if (!diaIso) return "Sem data";
  const d = new Date(`${diaIso}T12:00:00`);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  const base = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  if (d.toDateString() === hoje.toDateString()) return `Hoje · ${base}`;
  if (d.toDateString() === amanha.toDateString()) return `Amanhã · ${base}`;
  return base;
}

export default function Agendamentos() {
  const { isAdmin } = useAuth();
  const { confirm, dialogState, handleClose } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState([]);
  const [filtros, setFiltros] = useState({
    data_inicio: "",
    data_fim: "",
    status: "",
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);

  useEffect(() => {
    carregarAgendamentos();
  }, [filtros]);

  const carregarAgendamentos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.data_inicio)
        params.append("data_inicio", filtros.data_inicio);
      if (filtros.data_fim) params.append("data_fim", filtros.data_fim);
      if (filtros.status) params.append("status", filtros.status);

      params.append("limit", "500");
      const response = await api.get(`/agendamentos?${params}`);
      setAgendamentos(unwrapListResponse(response.data));
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setAgendamentoEditando(null);
    setModalAberto(true);
  };

  const abrirModalEditar = (agendamento) => {
    setAgendamentoEditando(agendamento);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setAgendamentoEditando(null);
  };

  const handleSalvar = async () => {
    await carregarAgendamentos();
    fecharModal();
  };

  const handleDeletar = async (id) => {
    const ok = await confirm({
      title: "Excluir agendamento",
      message: "Tem certeza que deseja excluir este agendamento?",
      confirmLabel: "Excluir",
    });
    if (!ok) return;

    try {
      await api.delete(`/agendamentos/${id}`);
      toast.success("Agendamento deletado com sucesso!");
      carregarAgendamentos();
    } catch (error) {
      console.error("Erro ao deletar agendamento:", error);
      toast.error("Erro ao deletar agendamento");
    }
  };

  const handleAtualizarStatus = async (id, novoStatus) => {
    try {
      await api.put(`/agendamentos/${id}`, { status: novoStatus });
      toast.success("Status atualizado com sucesso!");
      carregarAgendamentos();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };



  if (loading) return <LoadingSpinner size="xl" />;

  return (
    <div className="page-enter space-y-6">
      <ConfirmDialog
        open={!!dialogState}
        title={dialogState?.title}
        message={dialogState?.message}
        confirmLabel={dialogState?.confirmLabel}
        cancelLabel={dialogState?.cancelLabel}
        onCancel={() => handleClose(false)}
        onConfirm={() => handleClose(true)}
      />

      <PageHeader
        title="Agendamentos"
        subtitle="Gerencie os agendamentos da oficina."
        actions={
          isAdmin ? (
            <Button onClick={abrirModalNovo} icon={FiPlus} className="w-full sm:w-auto">
              Novo agendamento
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Data Início"
            type="date"
            value={filtros.data_inicio}
            onChange={(e) =>
              setFiltros({ ...filtros, data_inicio: e.target.value })
            }
          />
          <Input
            label="Data Fim"
            type="date"
            value={filtros.data_fim}
            onChange={(e) =>
              setFiltros({ ...filtros, data_fim: e.target.value })
            }
          />
          <Select
            label="Status"
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="Agendado">Agendado</option>
            <option value="Confirmado">Confirmado</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
            <option value="Cancelado">Cancelado</option>
          </Select>
          <div className="flex items-end gap-2">
          </div>
        </div>
      </Card>

      {/* Agenda agrupada por dia */}
      {agendamentos.length === 0 ? (
        <div className="pro-card">
          <EmptyState
            icon={FiCalendar}
            title="Nenhum agendamento"
            description="Agende a entrada de veículos para organizar o dia da oficina."
            action={
              isAdmin && (
                <button type="button" onClick={abrirModalNovo} className="btn-brand">
                  <FiPlus className="h-4 w-4" /> Novo agendamento
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {agruparPorDia(agendamentos).map(([dia, itens]) => (
            <section key={dia} className="pro-card overflow-hidden">
              <header className="card-header !py-2.5 bg-ink-50/60 dark:bg-ink-850/40">
                <h2 className="text-sm font-semibold text-ink-900 dark:text-white capitalize">{rotuloDia(dia)}</h2>
                <span className="text-xs text-ink-500">{itens.length} agendamento(s)</span>
              </header>
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {itens.map((agendamento) => (
                  <li key={agendamento.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-14 shrink-0 text-right">
                        <p className="text-sm font-semibold num text-ink-900 dark:text-white">{String(agendamento.hora_inicio || "").slice(0, 5)}</p>
                        {agendamento.hora_fim && <p className="text-2xs text-ink-500 num">até {String(agendamento.hora_fim).slice(0, 5)}</p>}
                      </div>
                      <div className="min-w-0 flex-1 border-l-2 border-ink-200 dark:border-ink-700 pl-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-ink-900 dark:text-white">{agendamento.cliente_nome}</p>
                          <StatusBadge kind="agendamento" status={agendamento.status} size="sm" />
                        </div>
                        <p className="text-sm text-ink-700 dark:text-ink-300">{agendamento.tipo_servico}</p>
                        <p className="text-xs text-ink-500">
                          {(agendamento.veiculo_modelo || agendamento.veiculo_placa) &&
                            rotuloVeiculo({
                              marca: agendamento.veiculo_marca,
                              modelo: agendamento.veiculo_modelo,
                              versao: agendamento.veiculo_versao,
                              motor: agendamento.veiculo_motor,
                              ano: agendamento.veiculo_ano,
                              placa: agendamento.veiculo_placa,
                            })}
                          {agendamento.mecanico_responsavel ? ` · ${agendamento.mecanico_responsavel}` : ""}
                          {agendamento.valor_estimado ? ` · estimado ${formatarMoeda(agendamento.valor_estimado)}` : ""}
                        </p>
                        {agendamento.observacoes && <p className="text-xs text-ink-500 mt-0.5">{agendamento.observacoes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:justify-end pl-[4.5rem] sm:pl-0">
                      {agendamento.status === "Agendado" && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => handleAtualizarStatus(agendamento.id, "Confirmado")}>
                          <FiCheck className="h-3.5 w-3.5" /> Confirmar
                        </button>
                      )}
                      {agendamento.status === "Confirmado" && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => handleAtualizarStatus(agendamento.id, "Em Andamento")}>
                          <FiPlay className="h-3.5 w-3.5" /> Iniciar
                        </button>
                      )}
                      {agendamento.status === "Em Andamento" && (
                        <button type="button" className="btn-success btn-sm" onClick={() => handleAtualizarStatus(agendamento.id, "Concluído")}>
                          <FiCheck className="h-3.5 w-3.5" /> Concluir
                        </button>
                      )}
                      {isAdmin && (
                        <button type="button" className="btn-ghost btn-sm !px-1.5" onClick={() => abrirModalEditar(agendamento)} aria-label="Editar" title="Editar">
                          <FiEdit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button type="button" className="btn-ghost btn-sm !px-1.5 text-ink-400 hover:!text-red-600" onClick={() => handleDeletar(agendamento.id)} aria-label="Excluir" title="Excluir">
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Modal de Criar/Editar */}
      {modalAberto && (
        <AgendamentoModal
          agendamento={agendamentoEditando}
          onClose={fecharModal}
          onSalvar={handleSalvar}
        />
      )}
    </div>
  );
}

// Componente Modal de Agendamento
function AgendamentoModal({ agendamento, onClose, onSalvar }) {
  const [formData, setFormData] = useState({
    cliente_id: agendamento?.cliente_id || "",
    veiculo_id: agendamento?.veiculo_id || "",
    data_agendamento: agendamento?.data_agendamento || "",
    hora_inicio: agendamento?.hora_inicio || "",
    hora_fim: agendamento?.hora_fim || "",
    tipo_servico: agendamento?.tipo_servico || "",
    observacoes: agendamento?.observacoes || "",
    valor_estimado: agendamento?.valor_estimado || "",
    mecanico_responsavel: agendamento?.mecanico_responsavel || "",
  });
  const [veiculos, setVeiculos] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (formData.cliente_id) {
      carregarVeiculos(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  const carregarVeiculos = async (clienteId) => {
    try {
      const response = await api.get(`/veiculos/cliente/${clienteId}`);
      setVeiculos(response.data);
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);

    try {
      if (agendamento) {
        await api.put(`/agendamentos/${agendamento.id}`, formData);
        toast.success("Agendamento atualizado com sucesso!");
      } else {
        await api.post("/agendamentos", formData);
        toast.success("Agendamento criado com sucesso!");
      }
      onSalvar();
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      toast.error(error.response?.data?.error || "Erro ao salvar agendamento");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={agendamento ? "Editar Agendamento" : "Novo Agendamento"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ClienteAutocomplete
          value={formData.cliente_id}
          onChange={(clienteId) =>
            setFormData({ ...formData, cliente_id: clienteId, veiculo_id: "" })
          }
        />

        {formData.cliente_id && veiculos.length > 0 && (
          <Select
            label="Veículo"
            value={formData.veiculo_id}
            onChange={(e) =>
              setFormData({ ...formData, veiculo_id: e.target.value })
            }
          >
            <option value="">Selecione um veículo</option>
            {veiculos.map((veiculo) => (
              <option key={veiculo.id} value={veiculo.id}>
                {rotuloVeiculo(veiculo)}
              </option>
            ))}
          </Select>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data"
            type="date"
            required
            value={formData.data_agendamento}
            onChange={(e) =>
              setFormData({ ...formData, data_agendamento: e.target.value })
            }
          />
          <Input
            label="Hora Início"
            type="time"
            required
            value={formData.hora_inicio}
            onChange={(e) =>
              setFormData({ ...formData, hora_inicio: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Hora Fim (opcional)"
            type="time"
            value={formData.hora_fim}
            onChange={(e) =>
              setFormData({ ...formData, hora_fim: e.target.value })
            }
          />
          <Input
            label="Valor Estimado (opcional)"
            type="number"
            step="0.01"
            value={formData.valor_estimado}
            onChange={(e) =>
              setFormData({ ...formData, valor_estimado: e.target.value })
            }
          />
        </div>

        <Input
          label="Tipo de Serviço"
          required
          value={formData.tipo_servico}
          onChange={(e) =>
            setFormData({ ...formData, tipo_servico: e.target.value })
          }
          placeholder="Ex: Troca de óleo, Revisão, Alinhamento..."
        />

        <Input
          label="Mecânico Responsável (opcional)"
          value={formData.mecanico_responsavel}
          onChange={(e) =>
            setFormData({ ...formData, mecanico_responsavel: e.target.value })
          }
        />

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
            placeholder="Observações sobre o agendamento..."
          />
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
