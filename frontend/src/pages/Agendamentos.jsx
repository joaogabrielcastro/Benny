import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Card from "../components/Card";
import Button from "../components/Button";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Select from "../components/Select";
import ClienteAutocomplete from "../components/ClienteAutocomplete";
import { formatarData, formatarHora } from "../utils/formatters";
import {
  FiCalendar,
  FiClock,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
} from "react-icons/fi";

export default function Agendamentos() {
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState([]);
  const [filtros, setFiltros] = useState({
    data_inicio: "",
    data_fim: "",
    status: "",
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [visualizacao, setVisualizacao] = useState("lista"); // lista ou calendario

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

      const response = await api.get(`/agendamentos?${params}`);
      setAgendamentos(response.data);
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
    if (!confirm("Tem certeza que deseja deletar este agendamento?")) return;

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

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "Agendado":
        return "info";
      case "Confirmado":
        return "success";
      case "Em Andamento":
        return "warning";
      case "Concluído":
        return "success";
      case "Cancelado":
        return "error";
      default:
        return "default";
    }
  };

  if (loading) return <LoadingSpinner size="xl" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Agendamentos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie os agendamentos da oficina
          </p>
        </div>
        <Button onClick={abrirModalNovo} icon={FiPlus}>
          Novo Agendamento
        </Button>
      </div>

      {/* Filtros */}
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
            <Button
              variant="outline"
              onClick={() =>
                setVisualizacao(
                  visualizacao === "lista" ? "calendario" : "lista"
                )
              }
              className="flex-1"
            >
              {visualizacao === "lista" ? "Ver Calendário" : "Ver Lista"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Agendamentos */}
      <div className="grid gap-4">
        {agendamentos.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Nenhum agendamento
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Comece criando um novo agendamento.
              </p>
              <div className="mt-6">
                <Button onClick={abrirModalNovo} icon={FiPlus}>
                  Novo Agendamento
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          agendamentos.map((agendamento) => (
            <Card
              key={agendamento.id}
              className="hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {agendamento.cliente_nome}
                    </h3>
                    <Badge variant={getStatusBadgeVariant(agendamento.status)}>
                      {agendamento.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="text-blue-500" />
                      <span>{formatarData(agendamento.data_agendamento)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiClock className="text-green-500" />
                      <span>
                        {agendamento.hora_inicio}
                        {agendamento.hora_fim && ` - ${agendamento.hora_fim}`}
                      </span>
                    </div>
                    {agendamento.veiculo_modelo && (
                      <div>
                        <strong>Veículo:</strong> {agendamento.veiculo_modelo}{" "}
                        {agendamento.veiculo_placa &&
                          `(${agendamento.veiculo_placa})`}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <p className="text-sm">
                      <strong className="text-gray-700 dark:text-gray-300">
                        Serviço:
                      </strong>{" "}
                      <span className="text-gray-600 dark:text-gray-400">
                        {agendamento.tipo_servico}
                      </span>
                    </p>
                    {agendamento.mecanico_responsavel && (
                      <p className="text-sm mt-1">
                        <strong className="text-gray-700 dark:text-gray-300">
                          Mecânico:
                        </strong>{" "}
                        <span className="text-gray-600 dark:text-gray-400">
                          {agendamento.mecanico_responsavel}
                        </span>
                      </p>
                    )}
                    {agendamento.observacoes && (
                      <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                        {agendamento.observacoes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {agendamento.status === "Agendado" && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() =>
                        handleAtualizarStatus(agendamento.id, "Confirmado")
                      }
                      icon={FiCheck}
                      title="Confirmar"
                    />
                  )}
                  {agendamento.status === "Confirmado" && (
                    <Button
                      size="sm"
                      variant="warning"
                      onClick={() =>
                        handleAtualizarStatus(agendamento.id, "Em Andamento")
                      }
                      title="Iniciar"
                    >
                      Iniciar
                    </Button>
                  )}
                  {agendamento.status === "Em Andamento" && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() =>
                        handleAtualizarStatus(agendamento.id, "Concluído")
                      }
                      icon={FiCheck}
                      title="Concluir"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirModalEditar(agendamento)}
                    icon={FiEdit2}
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeletar(agendamento.id)}
                    icon={FiTrash2}
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

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
                {veiculo.modelo} - {veiculo.placa}
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

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
