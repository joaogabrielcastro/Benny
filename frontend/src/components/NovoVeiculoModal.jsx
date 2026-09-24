import { useEffect, useState } from "react";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import Select from "./Select";
import { validarPlaca, validarObrigatorio, validarChassiOpcional } from "../utils/validators";
import { mascaraPlaca } from "../utils/masks";
import { showSuccess, showError } from "../utils/toast.jsx";
import api from "../services/api";
import BuscaPlacaVeiculoButton from "./BuscaPlacaVeiculoButton";
import { COMBUSTIVEIS } from "../features/veiculos/rotuloVeiculo";

const vazio = {
  modelo: "",
  marca: "",
  ano: "",
  placa: "",
  cor: "",
  chassi: "",
  versao: "",
  motor: "",
  combustivel: "",
};

function preencher(origem) {
  return {
    modelo: origem?.modelo || "",
    marca: origem?.marca || "",
    ano: origem?.ano != null ? String(origem.ano) : "",
    placa: origem?.placa || "",
    cor: origem?.cor || "",
    chassi: origem?.chassi || "",
    versao: origem?.versao || "",
    motor: origem?.motor || "",
    combustivel: origem?.combustivel || "",
  };
}

const NovoVeiculoModal = ({ isOpen, onClose, clienteId, onVeiculoCriado, veiculo = null }) => {
  const editando = Boolean(veiculo?.id);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(vazio);

  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 30 }, (_, i) => anoAtual - i);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(veiculo?.id ? preencher(veiculo) : vazio);
  }, [isOpen, veiculo]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clienteId) {
      showError("Selecione um cliente primeiro");
      return;
    }

    // Remover apenas o traço da placa antes de enviar, mantendo letras e números
    const dadosLimpos = {
      ...formData,
      cliente_id: clienteId,
      placa: formData.placa.replace(/[^A-Z0-9]/g, ""),
      chassi: formData.chassi.trim().toUpperCase() || undefined,
    };

    setLoading(true);
    try {
      const response = editando
        ? await api.put(`/veiculos/${veiculo.id}`, dadosLimpos)
        : await api.post("/veiculos", dadosLimpos);
      showSuccess(editando ? "Veículo atualizado com sucesso!" : "Veículo cadastrado com sucesso!");
      onVeiculoCriado(response.data);
      handleClose();
    } catch (error) {
      console.error("Erro ao cadastrar veículo:", error);
      showError(error.response?.data?.message || "Erro ao cadastrar veículo");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(vazio);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editando ? "Editar Veículo" : "Novo Veículo"}
      size="lg"
      footer={
        <>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            className="w-full sm:w-auto"
          >
            {editando ? "Salvar" : "Cadastrar Veículo"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 p-4 rounded-lg border border-blue-200/60 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 min-w-0">
              <Input
                label="Placa"
                value={formData.placa}
                onChange={(e) =>
                  setFormData({ ...formData, placa: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.form?.querySelector("[data-busca-placa]")?.click();
                  }
                }}
                mask={mascaraPlaca}
                validator={validarPlaca}
                placeholder="ABC-1234 ou ABC1D23"
                required
              />
            </div>
            <BuscaPlacaVeiculoButton
              placa={formData.placa}
              className="w-full sm:w-auto shrink-0"
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
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Comece pela placa — clique em <strong>Buscar pela placa</strong> ou
            pressione Enter para preencher os demais campos.
          </p>
        </div>

        <Input
          label="Chassi"
          value={formData.chassi}
          onChange={(e) =>
            setFormData({
              ...formData,
              chassi: e.target.value.toUpperCase(),
            })
          }
          validator={validarChassiOpcional}
          helperText="Chassi inválido (17 caracteres ou parcial da consulta)"
          placeholder="Preenchido ao buscar pela placa"
          maxLength={20}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Marca"
            value={formData.marca}
            onChange={(e) =>
              setFormData({ ...formData, marca: e.target.value })
            }
            validator={validarObrigatorio}
            placeholder="Ex: Volkswagen, Fiat, Toyota"
            required
          />

          <Input
            label="Modelo"
            value={formData.modelo}
            onChange={(e) =>
              setFormData({ ...formData, modelo: e.target.value })
            }
            validator={validarObrigatorio}
            placeholder="Ex: Gol, Uno, Corolla"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Versão"
            value={formData.versao}
            onChange={(e) => setFormData({ ...formData, versao: e.target.value })}
            placeholder="Ex: Comfortline, Highline"
          />
          <Select
            label="Ano"
            value={formData.ano}
            onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
            options={[
              { value: "", label: "Selecione o ano" },
              ...anosDisponiveis.map((ano) => ({
                value: String(ano),
                label: String(ano),
              })),
            ]}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Motor"
            value={formData.motor}
            onChange={(e) => setFormData({ ...formData, motor: e.target.value })}
            placeholder="Ex: 2.0 TSI, 1.6 MSI"
          />
          <Select
            label="Combustível"
            value={formData.combustivel}
            onChange={(e) => setFormData({ ...formData, combustivel: e.target.value })}
            options={[
              { value: "", label: "Não informado" },
              ...COMBUSTIVEIS.map((item) => ({ value: item, label: item })),
            ]}
          />
        </div>

        <Input
          label="Cor"
          value={formData.cor}
          onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
          placeholder="Ex: Prata, Preto, Branco"
        />
      </form>
    </Modal>
  );
};

export default NovoVeiculoModal;
