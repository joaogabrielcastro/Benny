import axios from "axios";
import { AppError, badRequest, notFound } from "../lib/AppError.js";

function onlyDigits(cep) {
  return String(cep || "").replace(/\D/g, "");
}

function mapViaCep(data) {
  return {
    cep: data.cep,
    logradouro: data.logradouro || "",
    complemento: data.complemento || "",
    bairro: data.bairro || "",
    cidade: data.localidade || "",
    estado: data.uf || "",
    ibge: data.ibge || "",
    gia: data.gia || "",
    ddd: data.ddd || "",
    siafi: data.siafi || "",
  };
}

function mapBrasilApi(data) {
  return {
    cep: data.cep,
    logradouro: data.street || "",
    complemento: "",
    bairro: data.neighborhood || "",
    cidade: data.city || "",
    estado: data.state || "",
    ibge: data.location?.ibge?.code || data.city_ibge || "",
    gia: "",
    ddd: "",
    siafi: "",
  };
}

async function consultarViaCep(cepLimpo) {
  const response = await axios.get(
    `https://viacep.com.br/ws/${cepLimpo}/json/`,
    { timeout: 5000 },
  );
  if (response.data?.erro) return null;
  return mapViaCep(response.data);
}

async function consultarBrasilApi(cepLimpo) {
  try {
    const response = await axios.get(
      `https://brasilapi.com.br/api/cep/v2/${cepLimpo}`,
      { timeout: 5000 },
    );
    if (!response.data?.cep) return null;
    return mapBrasilApi(response.data);
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

class CepService {
  /**
   * Busca endereço pelo CEP (ViaCEP, com fallback BrasilAPI).
   * @param {string} cep
   * @returns {Promise<Object>}
   */
  async buscarEnderecoPorCep(cep) {
    const cepLimpo = onlyDigits(cep);
    if (cepLimpo.length !== 8) {
      throw badRequest("CEP inválido. Deve conter 8 dígitos.");
    }

    try {
      const viaCep = await consultarViaCep(cepLimpo);
      if (viaCep) return viaCep;

      const brasilApi = await consultarBrasilApi(cepLimpo);
      if (brasilApi) return brasilApi;

      throw notFound("CEP não encontrado. Confira os dígitos ou preencha o endereço manualmente.");
    } catch (error) {
      if (error instanceof AppError) throw error;

      if (error.response?.status === 400) {
        throw badRequest("CEP inválido ou mal formatado.");
      }
      if (error.code === "ECONNABORTED") {
        throw new AppError(
          504,
          "Timeout ao consultar o CEP. Tente novamente ou preencha o endereço manualmente.",
        );
      }

      throw new AppError(
        502,
        "Serviço de CEP indisponível no momento. Preencha o endereço manualmente.",
      );
    }
  }
}

export default new CepService();
