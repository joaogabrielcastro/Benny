import { useState } from "react";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import BuscaCEP from "./BuscaCEP";
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

const NovoClienteModal = ({ isOpen, onClose, onClienteCriado }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
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
  });

  const handleEnderecoEncontrado = (endereco) => {
    setFormData({
      ...formData,
      cep: endereco.cep,
      endereco: endereco.logradouro,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
      complemento: endereco.complemento || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Remover máscaras antes de enviar
    const dadosLimpos = {
      ...formData,
      cpf_cnpj: removerMascara(formData.cpf_cnpj),
      telefone: removerMascara(formData.telefone),
      cep: removerMascara(formData.cep),
    };

    setLoading(true);
    try {
      const response = await api.post("/clientes", dadosLimpos);
      showSuccess("Cliente cadastrado com sucesso!");
      onClienteCriado(response.data);
      handleClose();
    } catch (error) {
      console.error("Erro ao cadastrar cliente:", error);
      showError(error.response?.data?.message || "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
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
    });
    onClose();
  };

  const getMascaraDocumento = () => {
    return formData.tipo_pessoa === "fisica" ? mascaraCPF : mascaraCNPJ;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Novo Cliente"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Cadastrar Cliente
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de Pessoa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de Pessoa *
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
              />
              <span className="text-gray-700 dark:text-gray-300">
                Pessoa Física
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
              />
              <span className="text-gray-700 dark:text-gray-300">
                Pessoa Jurídica
              </span>
            </label>
          </div>
        </div>

        {/* Nome */}
        <Input
          label={
            formData.tipo_pessoa === "fisica" ? "Nome Completo" : "Razão Social"
          }
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          validator={validarObrigatorio}
          required
        />

        {/* CPF/CNPJ */}
        <Input
          label={formData.tipo_pessoa === "fisica" ? "CPF" : "CNPJ"}
          value={formData.cpf_cnpj}
          onChange={(e) =>
            setFormData({ ...formData, cpf_cnpj: e.target.value })
          }
          mask={getMascaraDocumento()}
          validator={validarCPFouCNPJ}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* E-mail */}
          <Input
            label="E-mail"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            validator={validarEmail}
          />

          {/* Telefone */}
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

        {/* Busca de CEP */}
        <BuscaCEP onEnderecoEncontrado={handleEnderecoEncontrado} />

        {/* Endereço */}
        <Input
          label="Endereço (Rua/Avenida)"
          value={formData.endereco}
          onChange={(e) =>
            setFormData({ ...formData, endereco: e.target.value })
          }
          placeholder="Será preenchido automaticamente pelo CEP"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Número */}
          <Input
            label="Número"
            value={formData.numero}
            onChange={(e) =>
              setFormData({ ...formData, numero: e.target.value })
            }
            placeholder="123"
          />

          {/* Complemento */}
          <Input
            label="Complemento"
            value={formData.complemento}
            onChange={(e) =>
              setFormData({ ...formData, complemento: e.target.value })
            }
            placeholder="Apto 45, Bloco B"
            className="md:col-span-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bairro */}
          <Input
            label="Bairro"
            value={formData.bairro}
            onChange={(e) =>
              setFormData({ ...formData, bairro: e.target.value })
            }
            placeholder="Será preenchido automaticamente pelo CEP"
          />

          {/* Cidade */}
          <Input
            label="Cidade"
            value={formData.cidade}
            onChange={(e) =>
              setFormData({ ...formData, cidade: e.target.value })
            }
            placeholder="Será preenchido automaticamente pelo CEP"
          />

          {/* Estado */}
          <Input
            label="Estado"
            value={formData.estado}
            onChange={(e) =>
              setFormData({ ...formData, estado: e.target.value.toUpperCase() })
            }
            maxLength={2}
            placeholder="SP"
          />
        </div>
      </form>
    </Modal>
  );
};

export default NovoClienteModal;
