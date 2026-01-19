import { useState } from "react";
import Input from "./Input";
import Button from "./Button";
import { FiSearch } from "react-icons/fi";
import api from "../services/api";
import toast from "react-hot-toast";

export default function BuscaCEP({ onEnderecoEncontrado }) {
  const [cep, setCep] = useState("");
  const [buscando, setBuscando] = useState(false);

  const buscarCEP = async () => {
    if (!cep || cep.replace(/\D/g, "").length !== 8) {
      toast.error("CEP inválido. Digite 8 dígitos.");
      return;
    }

    setBuscando(true);
    try {
      const response = await api.get(`/cep/${cep.replace(/\D/g, "")}`);

      toast.success("CEP encontrado!");

      // Chamar callback com os dados do endereço
      if (onEnderecoEncontrado) {
        onEnderecoEncontrado(response.data);
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error(error.response?.data?.error || "Erro ao buscar CEP");
    } finally {
      setBuscando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      buscarCEP();
    }
  };

  const formatarCEP = (valor) => {
    // Remove tudo que não é dígito
    const apenasNumeros = valor.replace(/\D/g, "");

    // Formata o CEP (00000-000)
    if (apenasNumeros.length <= 5) {
      return apenasNumeros;
    }

    return `${apenasNumeros.slice(0, 5)}-${apenasNumeros.slice(5, 8)}`;
  };

  const handleChange = (e) => {
    const valorFormatado = formatarCEP(e.target.value);
    setCep(valorFormatado);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Input
          label="CEP"
          value={cep}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="00000-000"
          maxLength="9"
        />
      </div>
      <div className="flex items-end">
        <Button
          onClick={buscarCEP}
          disabled={buscando || cep.replace(/\D/g, "").length !== 8}
          icon={FiSearch}
          size="md"
        >
          {buscando ? "Buscando..." : "Buscar"}
        </Button>
      </div>
    </div>
  );
}
