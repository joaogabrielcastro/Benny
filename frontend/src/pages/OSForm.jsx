import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import ClienteAutocomplete from "../components/ClienteAutocomplete";
import NovoClienteModal from "../components/NovoClienteModal";
import BuscaPlacaVeiculoButton from "../components/BuscaPlacaVeiculoButton";
import { mascaraPlaca } from "../utils/masks";
import { validarPlaca } from "../utils/validators";
import toast from "react-hot-toast";
import PageHeader from "../components/layout/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatarMoeda } from "../utils/formatters";
import { useAuth } from "../contexts/AuthContext";
import { useOSForm } from "../hooks/os/useOSForm";
import OSFormItensProdutos from "../features/os/OSFormItensProdutos";
import OSFormItensServicos from "../features/os/OSFormItensServicos";

export default function OSForm() {
  const { isAdmin } = useAuth();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const f = useOSForm(id);
  const {
    modoEdicao,
    navigate,
    veiculos,
    produtos,
    mostrarClienteForm,
    setMostrarClienteForm,
    mostrarVeiculoForm,
    setMostrarVeiculoForm,
    carregando,
    formData,
    setFormData,
    itensProdutos,
    itensServicos,
    adicionarProduto,
    adicionarServico,
    removerProduto,
    removerServico,
    atualizarProduto,
    atualizarServico,
    calcularTotal,
    handleSubmit,
    carregarVeiculos,
  } = f;

  return (
    <div className="page-enter">
      <PageHeader
        title={modoEdicao ? "Editar ordem de serviço" : "Nova ordem de serviço"}
        subtitle={
          modoEdicao
            ? "Atualize cliente, itens e observações da OS."
            : "Preencha os dados do cliente e adicione produtos e serviços."
        }
      />

      {carregando ? (
        <LoadingSpinner size="xl" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="pro-card p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Cliente e Veículo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cliente *
              </label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <ClienteAutocomplete
                    value={formData.cliente_id}
                    onChange={(clienteId) =>
                      setFormData({
                        ...formData,
                        cliente_id: clienteId,
                        veiculo_id: "",
                      })
                    }
                    onClienteSelecionado={(cliente) => {
                      if (cliente) {
                        carregarVeiculos(cliente.id);
                      } else {
                        setVeiculos([]);
                      }
                    }}
                    required
                  />
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setMostrarClienteForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    + Novo
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Veículo *
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.veiculo_id}
                  onChange={(e) =>
                    setFormData({ ...formData, veiculo_id: e.target.value })
                  }
                  required
                  disabled={!formData.cliente_id}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600"
                >
                  <option value="">Selecione o veículo</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.marca} {v.modelo} {v.cor} {v.ano} - Placa: {v.placa}
                    </option>
                  ))}
                </select>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setMostrarVeiculoForm(true)}
                    disabled={!formData.cliente_id}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    + Novo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Km
              </label>
              <input
                type="number"
                value={formData.km}
                onChange={(e) =>
                  setFormData({ ...formData, km: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Previsão de Entrega
              </label>
              <input
                type="date"
                value={formData.previsao_entrega}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    previsao_entrega: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Observações do Veículo
              </label>
              <input
                type="text"
                value={formData.observacoes_veiculo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    observacoes_veiculo: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Responsável Técnico
              </label>
              <input
                type="text"
                value={formData.responsavel_tecnico}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    responsavel_tecnico: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <OSFormItensProdutos
          itensProdutos={itensProdutos}
          produtos={produtos}
          onAdicionar={adicionarProduto}
          onRemover={removerProduto}
          onAtualizar={atualizarProduto}
        />

        <OSFormItensServicos
          itensServicos={itensServicos}
          onAdicionar={adicionarServico}
          onRemover={removerServico}
          onAtualizar={atualizarServico}
        />

        <div className="pro-card p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações Gerais
            </label>
            <textarea
              value={formData.observacoes_gerais}
              onChange={(e) =>
                setFormData({ ...formData, observacoes_gerais: e.target.value })
              }
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-between items-center border-t dark:border-gray-700 pt-4">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">
              Valor Total:
            </span>
            <span className="text-3xl font-bold text-brand-600 dark:text-brand-400">
              {formatarMoeda(calcularTotal())}
            </span>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/ordens-servico")}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" className="btn-brand">
            {modoEdicao ? "Atualizar OS" : "Salvar OS"}
          </button>
        </div>
      </form>
      )}

      {/* Modais */}
      <NovoClienteModal
        isOpen={mostrarClienteForm}
        onClose={() => setMostrarClienteForm(false)}
        onClienteCriado={(cliente) => {
          queryClient.invalidateQueries({ queryKey: ["clientes"] });
          setFormData({
            ...formData,
            cliente_id: cliente.id,
            veiculo_id: "",
          });
          carregarVeiculos(cliente.id);
        }}
      />

      {mostrarVeiculoForm && formData.cliente_id && (
        <VeiculoFormModal
          clienteId={formData.cliente_id}
          onClose={(veiculoId) => {
            setMostrarVeiculoForm(false);
            if (veiculoId) {
              carregarVeiculos(formData.cliente_id);
              setFormData({ ...formData, veiculo_id: veiculoId });
            }
          }}
        />
      )}
    </div>
  );
}

function VeiculoFormModal({ clienteId, onClose }) {
  const [formData, setFormData] = useState({
    cliente_id: clienteId,
    marca: "",
    modelo: "",
    cor: "",
    placa: "",
    ano: "",
    chassi: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarPlaca(formData.placa.replace(/[^A-Z0-9]/gi, ""))) {
      toast.error("Placa inválida.");
      return;
    }
    try {
      const payload = {
        ...formData,
        placa: formData.placa.replace(/[^A-Z0-9]/g, "").toUpperCase(),
        chassi: formData.chassi.trim().toUpperCase() || undefined,
      };
      const response = await api.post("/veiculos", payload);
      toast.success("Veículo criado com sucesso!");
      onClose(response.data.id);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao criar veículo");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Novo Veículo
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/80 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placa *
                  </label>
                  <input
                    type="text"
                    value={formData.placa}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        placa: mascaraPlaca(e.target.value),
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget
                          .closest("form")
                          ?.querySelector("[data-busca-placa]")
                          ?.click();
                      }
                    }}
                    required
                    placeholder="ABC-1234 ou ABC1D23"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <BuscaPlacaVeiculoButton
                  className="w-full sm:w-auto shrink-0"
                  placa={formData.placa}
                  onDados={(d) =>
                    setFormData((prev) => ({
                      ...prev,
                      marca: d.marca || prev.marca,
                      modelo: d.modelo || prev.modelo,
                      ano: d.ano ? String(d.ano) : prev.ano,
                      cor: d.cor || prev.cor,
                      chassi: d.chassi || prev.chassi,
                    }))
                  }
                />
              </div>
              <p className="text-xs text-gray-600">
                Comece pela placa — busque para preencher marca, modelo e demais
                dados.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chassi
              </label>
              <input
                type="text"
                value={formData.chassi}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    chassi: e.target.value.toUpperCase(),
                  })
                }
                maxLength={20}
                placeholder="Preenchido ao buscar pela placa"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  value={formData.marca}
                  onChange={(e) =>
                    setFormData({ ...formData, marca: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) =>
                    setFormData({ ...formData, modelo: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor
                </label>
                <input
                  type="text"
                  value={formData.cor}
                  onChange={(e) =>
                    setFormData({ ...formData, cor: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano
                </label>
                <input
                  type="text"
                  value={formData.ano}
                  onChange={(e) =>
                    setFormData({ ...formData, ano: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => onClose(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
