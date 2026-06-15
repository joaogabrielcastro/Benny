import { useState, useEffect } from "react";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import BuscaCEP from "./BuscaCEP";
import LoadingSpinner from "./LoadingSpinner";
import {
  validarCPFouCNPJ,
  validarTelefone,
  validarEmail,
  validarObrigatorio,
} from "../utils/validators";
import {
  mascaraCPF,
  mascaraCNPJ,
  mascaraTelefone,
  mascaraCEP,
  removerMascara,
} from "../utils/masks";
import { showSuccess, showError } from "../utils/toast.jsx";
import api from "../services/api";

const emptyForm = {
  tipo_pessoa: "fisica",
  nome: "",
  cpf_cnpj: "",
  email: "",
  telefone: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
};

function inferirTipoPessoa(cpfCnpj) {
  const d = removerMascara(cpfCnpj || "");
  return d.length > 11 ? "juridica" : "fisica";
}

function clienteParaForm(c) {
  const doc = c.cpf_cnpj || "";
  return {
    tipo_pessoa: inferirTipoPessoa(doc),
    nome: c.nome || "",
    cpf_cnpj: doc,
    email: c.email || "",
    telefone: c.telefone || "",
    endereco: c.endereco || "",
    numero: c.numero || "",
    complemento: c.complemento || "",
    bairro: c.bairro || "",
    cidade: c.cidade || "",
    estado: c.estado || "",
    cep: c.cep ? mascaraCEP(c.cep) : "",
  };
}

export default function ClienteFormModal({
  isOpen,
  onClose,
  clienteId = null,
  onSuccess,
}) {
  const editando = Boolean(clienteId);
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) return;
    if (!editando) {
      setFormData(emptyForm);
      return;
    }
    let cancelado = false;
    (async () => {
      setCarregando(true);
      try {
        const { data } = await api.get(`/clientes/${clienteId}`);
        if (!cancelado) setFormData(clienteParaForm(data));
      } catch {
        if (!cancelado) showError("Erro ao carregar cliente");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [isOpen, clienteId, editando]);

  const handleEnderecoEncontrado = (endereco) => {
    setFormData((prev) => ({
      ...prev,
      cep: endereco.cep,
      endereco: endereco.logradouro,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
      complemento: endereco.complemento || prev.complemento,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const dadosLimpos = {
      nome: formData.nome,
      cpf_cnpj: removerMascara(formData.cpf_cnpj),
      telefone: removerMascara(formData.telefone),
      email: formData.email,
      endereco: formData.endereco,
      numero: formData.numero,
      complemento: formData.complemento,
      bairro: formData.bairro,
      cidade: formData.cidade,
      estado: formData.estado,
      cep: removerMascara(formData.cep),
    };

    if (dadosLimpos.cep.length !== 8) {
      showError(
        "Informe um CEP com 8 dígitos. Use Buscar para preencher cidade e bairro corretamente.",
      );
      return;
    }

    if (!dadosLimpos.cidade?.trim()) {
      showError("Informe a cidade do cliente (use Buscar no CEP).");
      return;
    }

    setLoading(true);
    try {
      if (editando) {
        await api.put(`/clientes/${clienteId}`, dadosLimpos);
        showSuccess("Cliente atualizado com sucesso!");
        onSuccess?.({ id: clienteId });
      } else {
        const response = await api.post("/clientes", dadosLimpos);
        showSuccess("Cliente cadastrado com sucesso!");
        onSuccess?.(response.data);
      }
      handleClose();
    } catch (error) {
      showError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          (editando ? "Erro ao atualizar cliente" : "Erro ao cadastrar cliente"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(emptyForm);
    onClose();
  };

  const getMascaraDocumento = () =>
    formData.tipo_pessoa === "fisica" ? mascaraCPF : mascaraCNPJ;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editando ? "Editar cliente" : "Novo cliente"}
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
            disabled={carregando}
            className="w-full sm:w-auto"
          >
            {editando ? "Salvar alterações" : "Cadastrar cliente"}
          </Button>
        </>
      }
    >
      {carregando ? (
        <LoadingSpinner />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de pessoa *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="fisica"
                  checked={formData.tipo_pessoa === "fisica"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo_pessoa: e.target.value,
                      cpf_cnpj: "",
                    })
                  }
                  className="mr-2"
                  disabled={editando}
                />
                <span className="text-gray-700 dark:text-gray-300">
                  Pessoa física
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="juridica"
                  checked={formData.tipo_pessoa === "juridica"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo_pessoa: e.target.value,
                      cpf_cnpj: "",
                    })
                  }
                  className="mr-2"
                  disabled={editando}
                />
                <span className="text-gray-700 dark:text-gray-300">
                  Pessoa jurídica
                </span>
              </label>
            </div>
          </div>

          <Input
            label={
              formData.tipo_pessoa === "fisica" ? "Nome completo" : "Razão social"
            }
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            validator={validarObrigatorio}
            required
          />

          <Input
            label={formData.tipo_pessoa === "fisica" ? "CPF" : "CNPJ"}
            value={formData.cpf_cnpj}
            onChange={(e) =>
              setFormData({ ...formData, cpf_cnpj: e.target.value })
            }
            mask={getMascaraDocumento()}
            validator={validarCPFouCNPJ}
            required
            disabled={editando}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              validator={validarEmail}
            />
            <Input
              label="Telefone"
              value={formData.telefone}
              onChange={(e) =>
                setFormData({ ...formData, telefone: e.target.value })
              }
              mask={mascaraTelefone}
              validator={validarTelefone}
              required
            />
          </div>

          <BuscaCEP
            value={formData.cep}
            onChange={(cep) => setFormData({ ...formData, cep })}
            onEnderecoEncontrado={handleEnderecoEncontrado}
          />

          <Input
            label="Endereço (rua/avenida)"
            value={formData.endereco}
            onChange={(e) =>
              setFormData({ ...formData, endereco: e.target.value })
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Número"
              value={formData.numero}
              onChange={(e) =>
                setFormData({ ...formData, numero: e.target.value })
              }
            />
            <Input
              label="Complemento"
              value={formData.complemento}
              onChange={(e) =>
                setFormData({ ...formData, complemento: e.target.value })
              }
              className="md:col-span-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Bairro"
              value={formData.bairro}
              onChange={(e) =>
                setFormData({ ...formData, bairro: e.target.value })
              }
            />
            <Input
              label="Cidade"
              value={formData.cidade}
              onChange={(e) =>
                setFormData({ ...formData, cidade: e.target.value })
              }
              required
            />
            <Input
              label="Estado"
              value={formData.estado}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estado: e.target.value.toUpperCase(),
                })
              }
              maxLength={2}
              placeholder="SP"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}
