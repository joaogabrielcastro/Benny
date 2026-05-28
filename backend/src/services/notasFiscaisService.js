/**
 * Fachada do domínio de notas fiscais (implementação em ./notasFiscais/).
 */
export { mapNfParaRespostaApi } from "./notasFiscais/notasFiscaisMapper.js";
import {
  listar,
  buscarPorId,
  buscarPorOsId,
  listarPorOsId,
} from "./notasFiscais/notasFiscaisRepository.js";
import { sincronizarPorOs } from "./notasFiscais/notasFiscaisSincronizar.js";
import { gerarParaOs } from "./notasFiscais/notasFiscaisEmitir.js";
import { cancelar } from "./notasFiscais/notasFiscaisCancelar.js";
import { mapNfParaRespostaApi } from "./notasFiscais/notasFiscaisMapper.js";

export default {
  listar,
  buscarPorId,
  buscarPorOsId,
  listarPorOsId,
  listarPorOs: listarPorOsId,
  gerarParaOs,
  sincronizarPorOs,
  cancelar,
  mapNfParaRespostaApi,
};
