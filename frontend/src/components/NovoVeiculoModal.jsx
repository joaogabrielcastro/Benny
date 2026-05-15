import { useState } from "react";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import Select from "./Select";
import { validarPlaca, validarObrigatorio } from "../utils/validators";
import { mascaraPlaca } from "../utils/masks";
import { showSuccess, showError } from "../utils/toast.jsx";
import api from "../services/api";
import BuscaPlacaVeiculoButton from "./BuscaPlacaVeiculoButton";

const NovoVeiculoModal = ({ isOpen, onClose, clienteId, onVeiculoCriado }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    modelo: "",
    marca: "",
    ano: "",
    placa: "",
    cor: "",
  });

  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 30 }, (_, i) => anoAtual - i);

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
      placa: formData.placa.replace(/[^A-Z0-9]/g, ""), // Remove apenas caracteres especiais, mantém letras e números
    };

    setLoading(true);
    try {
      const response = await api.post("/veiculos", dadosLimpos);
      showSuccess("Veículo cadastrado com sucesso!");
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
    setFormData({
      modelo: "",
      marca: "",
      ano: "",
      placa: "",
      cor: "",
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Novo Veículo"
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
            Cadastrar Veículo
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Marca */}
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

          {/* Modelo */}
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

        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="w-full lg:w-44 shrink-0">
            <Select
              label="Ano"
              value={formData.ano}
              onChange={(e) =>
                setFormData({ ...formData, ano: e.target.value })
              }
              options={[
                { value: "", label: "Selecione o ano" },
                ...anosDisponiveis.map((ano) => ({ value: ano, label: ano })),
              ]}
              required
            />
          </div>
          <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:items-end min-w-0">
            <div className="flex-1 min-w-[160px]">
              <Input
                label="Placa"
                value={formData.placa}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    placa: e.target.value.toUpperCase(),
                  })
                }
                mask={mascaraPlaca}
                validator={validarPlaca}
                placeholder="ABC-1234"
                required
              />
            </div>
            <BuscaPlacaVeiculoButton
              placa={formData.placa}
              onDados={(d) =>
                setFormData((prev) => ({
                  ...prev,
                  marca: d.marca || prev.marca,
                  modelo: d.modelo || prev.modelo,
                  ano: d.ano || prev.ano,
                  cor: d.cor || prev.cor,
                }))
              }
            />
          </div>
          <div className="w-full lg:w-48 shrink-0">
            <Input
              label="Cor"
              value={formData.cor}
              onChange={(e) =>
                setFormData({ ...formData, cor: e.target.value })
              }
              placeholder="Ex: Prata, Preto, Branco"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default NovoVeiculoModal;
