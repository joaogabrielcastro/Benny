import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Card from "../components/Card";
import Button from "../components/Button";
import Badge from "../components/Badge";
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
} from "react-icons/fi";

export default function ContasPagar() {
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState([]);
  const [alertas, setAlertas] = useState({ vencidas: [], aVencer: [] });
  const [filtros, setFiltros] = useState({
    status: "",
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

      const [contasRes, alertasRes] = await Promise.all([
        api.get(`/contas-pagar?${params}`),
        api.get("/contas-pagar/alertas/resumo"),
      ]);

      setContas(contasRes.data);
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
    if (!confirm("Tem certeza que deseja deletar esta conta?")) return;

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

  const getStatusBadgeVariant = (conta) => {
    if (conta.status === "Pago") return "success";
    if (conta.status === "Cancelado") return "danger";

    const hoje = new Date();
    const vencimento = new Date(conta.data_vencimento);

    if (vencimento < hoje) return "danger";
    if (vencimento.getTime() - hoje.getTime() <= 3 * 24 * 60 * 60 * 1000)
      return "warning";

    return "info";
  };

  const getStatusTexto = (conta) => {
    if (conta.status === "Pago") return "✓ Pago";
    if (conta.status === "Cancelado") return "✕ Cancelado";

    const hoje = new Date();
    const vencimento = new Date(conta.data_vencimento);

    if (vencimento < hoje) return "⚠ Vencida";
    if (vencimento.getTime() - hoje.getTime() <= 3 * 24 * 60 * 60 * 1000)
      return "⏰ Vence em breve";

    return "○ Pendente";
  };

  const totais = calcularTotais();

  if (loading) return <LoadingSpinner size="xl" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Contas a Pagar
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Controle de despesas e pagamentos
          </p>
        </div>
        <Button onClick={abrirModalNovo} icon={FiPlus}>
          Nova Conta
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Total
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatarMoeda(totais.total)}
              </p>
            </div>
            <FiDollarSign className="text-4xl text-blue-500" />
          </div>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Pagas
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatarMoeda(totais.pagas)}
              </p>
            </div>
            <FiCheck className="text-4xl text-green-500" />
          </div>
        </Card>

        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                Pendentes
              </p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {formatarMoeda(totais.pendentes)}
              </p>
            </div>
            <FiCalendar className="text-4xl text-yellow-500" />
          </div>
        </Card>

        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                Vencidas
              </p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {alertas.vencidas.length}
              </p>
            </div>
            <FiAlertCircle className="text-4xl text-red-500" />
          </div>
        </Card>
      </div>

      {/* Alertas */}
      {(alertas.vencidas.length > 0 || alertas.aVencer.length > 0) && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-yellow-600 dark:text-yellow-400 text-xl flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Atenção: Contas Pendentes
              </h3>
              {alertas.vencidas.length > 0 && (
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">
                  • {alertas.vencidas.length} conta(s) vencida(s)
                </p>
              )}
              {alertas.aVencer.length > 0 && (
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  • {alertas.aVencer.length} conta(s) vencendo nos próximos 7
                  dias
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Status"
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="Pendente">Pendente</option>
            <option value="Pago">Pago</option>
            <option value="Cancelado">Cancelado</option>
          </Select>

          <Select
            label="Categoria"
            value={filtros.categoria}
            onChange={(e) =>
              setFiltros({ ...filtros, categoria: e.target.value })
            }
          >
            <option value="">Todas</option>
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
        </div>
      </Card>

      {/* Lista de Contas */}
      <div className="grid gap-4">
        {contas.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <FiDollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Nenhuma conta
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Comece criando uma nova conta a pagar.
              </p>
              <div className="mt-6">
                <Button onClick={abrirModalNovo} icon={FiPlus}>
                  Nova Conta
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          contas.map((conta) => {
            const hoje = new Date();
            const vencimento = new Date(conta.data_vencimento);
            const estaVencida = conta.status === "Pendente" && vencimento < hoje;
            const venceEmBreve = conta.status === "Pendente" && vencimento.getTime() - hoje.getTime() <= 3 * 24 * 60 * 60 * 1000;
            
            return (
              <Card 
                key={conta.id} 
                className={`hover:shadow-lg transition-all ${
                  estaVencida 
                    ? 'border-red-400 bg-red-50/50 dark:bg-red-900/10 dark:border-red-600' 
                    : venceEmBreve 
                    ? 'border-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/10 dark:border-yellow-600'
                    : ''
                }`}
              >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {conta.descricao}
                    </h3>
                    <Badge variant={getStatusBadgeVariant(conta)}>
                      {getStatusTexto(conta)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">
                        Categoria:
                      </strong>{" "}
                      {conta.categoria}
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">
                        Valor:
                      </strong>{" "}
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatarMoeda(conta.valor)}
                      </span>
                    </div>
                    <div>
                      <strong className="text-gray-700 dark:text-gray-300">
                        Vencimento:
                      </strong>{" "}
                      {formatarData(conta.data_vencimento)}
                    </div>
                    {conta.data_pagamento && (
                      <div>
                        <strong className="text-gray-700 dark:text-gray-300">
                          Pago em:
                        </strong>{" "}
                        {formatarData(conta.data_pagamento)}
                      </div>
                    )}
                  </div>

                  {conta.fornecedor && (
                    <p className="text-sm mt-2">
                      <strong className="text-gray-700 dark:text-gray-300">
                        Fornecedor:
                      </strong>{" "}
                      <span className="text-gray-600 dark:text-gray-400">
                        {conta.fornecedor}
                      </span>
                    </p>
                  )}

                  {conta.observacoes && (
                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                      {conta.observacoes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {conta.status === "Pendente" && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleMarcarPago(conta)}
                      icon={FiCheck}
                      title="Marcar como Pago"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirModalEditar(conta)}
                    icon={FiEdit2}
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeletar(conta.id)}
                    icon={FiTrash2}
                  />
                </div>
              </div>
            </Card>
            );
          })
        )}
      </div>

      {/* Modal de Criar/Editar */}
      {modalAberto && (
        <ContaModal
          conta={contaEditando}
          onClose={fecharModal}
          onSalvar={handleSalvar}
        />
      )}
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
