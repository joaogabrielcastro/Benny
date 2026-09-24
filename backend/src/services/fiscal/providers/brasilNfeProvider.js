import {
  baixarPdfNfe,
  baixarXmlNfe,
  cancelarNfe,
  emitirNfe,
  statusLocalNfe,
} from "../../brasilNfeClient.js";
import { FISCAL_PROVIDERS } from "../constants.js";
import { getFiscalCredentials } from "../credentials.js";

export const brasilNfeProvider = {
  id: FISCAL_PROVIDERS.BRASIL_NFE,
  rotulo: "Brasil NFe",

  isConfigured(tenantId) {
    return getFiscalCredentials(tenantId, FISCAL_PROVIDERS.BRASIL_NFE).configured;
  },

  mensagemNaoConfigurado() {
    return "Brasil NFe não configurada no servidor (BRASILNFE_TOKEN).";
  },

  async emitir(body, creds) {
    return emitirNfe(body, creds);
  },

  /**
   * Não há consulta HTTP neste projeto.
   * confirmadoExternamente=false: o status devolvido é só o inferido da chave local.
   * CONSULTA REMOTA NÃO IMPLEMENTADA: a doc oficial cobre EnviarNotaFiscal,
   * ObterArquivoNotaFiscal e ConsultarLoteNFe (lote). Não há consulta por chave.
   */
  async consultar(idProvedor) {
    const res = statusLocalNfe(idProvedor);
    return {
      ...res,
      confirmadoExternamente: false,
      fonte: "local",
    };
  },

  async cancelar(idProvedor, body, creds) {
    return cancelarNfe(idProvedor, body, creds);
  },

  async baixarPdf(idProvedor, creds) {
    return baixarPdfNfe(idProvedor, creds);
  },

  async baixarXml(idProvedor, tipo, creds) {
    return baixarXmlNfe(idProvedor, tipo, creds);
  },
};
