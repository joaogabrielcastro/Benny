import { useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import Button from "./Button";
import { FiSearch } from "react-icons/fi";
import { validarPlaca } from "../utils/validators";

function placaLimpa(placa) {
  return String(placa || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Busca dados básicos do veículo (marca, modelo, ano, cor) pela placa no backend.
 */
export default function BuscaPlacaVeiculoButton({ placa, onDados, className = "" }) {
  const [buscando, setBuscando] = useState(false);

  const buscar = async () => {
    const p = placaLimpa(placa);
    if (!validarPlaca(p)) {
      toast.error("Informe uma placa válida (antiga ou Mercosul).");
      return;
    }

    setBuscando(true);
    try {
      const { data } = await api.get(`/veiculos/consulta-placa/${encodeURIComponent(p)}`);
      onDados({
        marca: data.marca || "",
        modelo: data.modelo || "",
        ano: data.ano ? String(data.ano) : "",
        cor: data.cor || "",
        chassi: data.chassi || "",
      });
      toast.success(
        data.provedor
          ? `Dados obtidos (${data.provedor}). Revise e salve.`
          : "Dados do veículo preenchidos. Revise e salve.",
      );
    } catch (error) {
      console.error("Erro ao consultar placa:", error);
      toast.error(
        error.response?.data?.erro ||
          error.response?.data?.error ||
          "Não foi possível consultar a placa.",
      );
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className={`flex items-end ${className}`}>
      <Button
        type="button"
        data-busca-placa
        onClick={buscar}
        disabled={buscando || !validarPlaca(placaLimpa(placa))}
        loading={buscando}
        icon={FiSearch}
        variant="outline"
        size="md"
        fullWidth={className.includes("w-full")}
        className="sm:whitespace-nowrap"
        title={
          validarPlaca(placaLimpa(placa))
            ? "Buscar marca, modelo, ano e cor"
            : "Informe a placa completa (7 caracteres)"
        }
      >
        Buscar pela placa
      </Button>
    </div>
  );
}
