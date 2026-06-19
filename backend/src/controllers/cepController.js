import cepService from "../services/cepService.js";
import logger from "../config/logger.js";
import { badRequest } from "../lib/AppError.js";

export async function buscarCep(req, res) {
  const { cep } = req.params;
  if (!cep) throw badRequest("CEP é obrigatório");

  const endereco = await cepService.buscarEnderecoPorCep(cep);
  logger.info(`CEP consultado com sucesso: ${cep}`);
  res.json(endereco);
}
