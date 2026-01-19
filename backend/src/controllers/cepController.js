import cepService from "../services/cepService.js";
import logger from "../config/logger.js";

/**
 * Busca endereço por CEP
 * GET /api/cep/:cep
 */
export async function buscarCep(req, res) {
  try {
    const { cep } = req.params;

    if (!cep) {
      return res.status(400).json({ error: "CEP é obrigatório" });
    }

    const endereco = await cepService.buscarEnderecoPorCep(cep);

    logger.info(`CEP consultado com sucesso: ${cep}`);

    res.json(endereco);
  } catch (error) {
    logger.error(`Erro ao buscar CEP ${req.params.cep}:`, error);
    res.status(400).json({ error: error.message });
  }
}
