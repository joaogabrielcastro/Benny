import axios from "axios";

class CepService {
  /**
   * Busca informações de endereço pelo CEP
   * @param {string} cep - CEP a ser consultado (com ou sem máscara)
   * @returns {Promise<Object>} Dados do endereço
   */
  async buscarEnderecoPorCep(cep) {
    try {
      // Remove caracteres não numéricos
      const cepLimpo = cep.replace(/\D/g, "");

      // Valida formato do CEP
      if (cepLimpo.length !== 8) {
        throw new Error("CEP inválido. Deve conter 8 dígitos.");
      }

      // Consulta API ViaCEP
      const response = await axios.get(
        `https://viacep.com.br/ws/${cepLimpo}/json/`,
        {
          timeout: 5000, // 5 segundos de timeout
        }
      );

      // Verifica se o CEP foi encontrado
      if (response.data.erro) {
        throw new Error("CEP não encontrado.");
      }

      // Retorna dados formatados
      return {
        cep: response.data.cep,
        logradouro: response.data.logradouro,
        complemento: response.data.complemento,
        bairro: response.data.bairro,
        cidade: response.data.localidade,
        estado: response.data.uf,
        ibge: response.data.ibge,
        gia: response.data.gia,
        ddd: response.data.ddd,
        siafi: response.data.siafi,
      };
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error("CEP inválido ou mal formatado.");
      }

      if (error.code === "ECONNABORTED") {
        throw new Error("Timeout ao consultar o CEP. Tente novamente.");
      }

      throw new Error(error.message || "Erro ao buscar informações do CEP.");
    }
  }
}

export default new CepService();
