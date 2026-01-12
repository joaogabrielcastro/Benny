import { useState, useEffect, useRef } from "react";
import api from "../services/api";

export default function ClienteAutocomplete({
  value,
  onChange,
  onClienteSelecionado,
  required = false,
}) {
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const wrapperRef = useRef(null);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setMostrarSugestoes(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Buscar clientes com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busca.length >= 2) {
        buscarClientes();
      } else if (busca.length === 0) {
        setClientes([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [busca]);

  // Carregar cliente selecionado inicialmente
  useEffect(() => {
    if (value && !clienteSelecionado) {
      carregarCliente(value);
    }
  }, [value]);

  const carregarCliente = async (clienteId) => {
    try {
      const response = await api.get(`/clientes/${clienteId}`);
      setClienteSelecionado(response.data);
      setBusca(response.data.nome);
    } catch (error) {
      console.error("Erro ao carregar cliente:", error);
    }
  };

  const buscarClientes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/clientes", {
        params: { busca },
      });
      setClientes(response.data);
      setMostrarSugestoes(true);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const valor = e.target.value;
    setBusca(valor);
    setClienteSelecionado(null);
    onChange("");
    if (valor.length >= 2) {
      setMostrarSugestoes(true);
    }
  };

  const handleSelecionarCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setBusca(cliente.nome);
    setMostrarSugestoes(false);
    onChange(cliente.id);
    if (onClienteSelecionado) {
      onClienteSelecionado(cliente);
    }
  };

  const handleLimpar = () => {
    setBusca("");
    setClienteSelecionado(null);
    setClientes([]);
    setMostrarSugestoes(false);
    onChange("");
    if (onClienteSelecionado) {
      onClienteSelecionado(null);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={busca}
          onChange={handleInputChange}
          onFocus={() => {
            if (clientes.length > 0) {
              setMostrarSugestoes(true);
            }
          }}
          placeholder="Digite para buscar cliente..."
          required={required && !clienteSelecionado}
          className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        {loading && (
          <div className="absolute right-10 top-2.5">
            <svg
              className="animate-spin h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
        {busca && (
          <button
            type="button"
            onClick={handleLimpar}
            className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Limpar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Sugestões */}
      {mostrarSugestoes && clientes.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {clientes.map((cliente) => (
            <button
              key={cliente.id}
              type="button"
              onClick={() => handleSelecionarCliente(cliente)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {cliente.nome}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {cliente.telefone}
                {cliente.cpf_cnpj && ` • ${cliente.cpf_cnpj}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Nenhum resultado */}
      {mostrarSugestoes &&
        !loading &&
        busca.length >= 2 &&
        clientes.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
            Nenhum cliente encontrado
          </div>
        )}
    </div>
  );
}
