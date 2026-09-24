import {
  baixarPdfNfse,
  baixarXmlNfse,
  cancelarNfse,
  consultarNfse,
  emitirNfseDps,
} from "../../nuvemFiscalClient.js";
import { FISCAL_PROVIDERS } from "../constants.js";
import { getFiscalCredentials } from "../credentials.js";

export const notaasProvider = {
  id: FISCAL_PROVIDERS.NOTAAS,
  rotulo: "Notaas",

  isConfigured(tenantId) {
    return getFiscalCredentials(tenantId, FISCAL_PROVIDERS.NOTAAS).configured;
  },

  mensagemNaoConfigurado() {
    return "Notaas não configurada no servidor (NOTAAS_API_KEY).";
  },

  async emitir(body, creds) {
    return emitirNfseDps(body, creds);
  },

  /** Consulta HTTP real: GET /invoices/{id}/status */
  async consultar(idProvedor, creds) {
    const res = await consultarNfse(idProvedor, creds);
    return { ...res, confirmadoExternamente: true, fonte: "notaas" };
  },

  async cancelar(idProvedor, body, creds) {
    return cancelarNfse(idProvedor, body, creds);
  },

  async baixarPdf(idProvedor, creds) {
    return baixarPdfNfse(idProvedor, creds);
  },

  async baixarXml(idProvedor, tipo, creds) {
    return baixarXmlNfse(idProvedor, tipo, creds);
  },
};
