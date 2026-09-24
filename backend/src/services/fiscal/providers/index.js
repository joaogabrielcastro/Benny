import { resolveFiscalProviderId } from "../constants.js";
import { brasilNfeProvider } from "./brasilNfeProvider.js";
import { notaasProvider } from "./notaasProvider.js";
import { FISCAL_PROVIDERS } from "../constants.js";
import {
  carregarConfiguracoesTenant,
  getFiscalCredentials,
} from "../credentials.js";

const POR_ID = {
  [FISCAL_PROVIDERS.NOTAAS]: notaasProvider,
  [FISCAL_PROVIDERS.BRASIL_NFE]: brasilNfeProvider,
};

/** Único ponto do domínio para obter o provider fiscal. */
export function getFiscalProvider({
  modeloDocumento,
  provedor,
  tenantId,
  configuracoes = null,
} = {}) {
  const id = resolveFiscalProviderId({ modeloDocumento, provedor });
  const provider = POR_ID[id] || notaasProvider;
  const creds = () => getFiscalCredentials(tenantId, provider.id, configuracoes);
  return {
    id: provider.id,
    rotulo: provider.rotulo,
    tenantId: tenantId ?? null,
    isConfigured() {
      return creds().configured;
    },
    mensagemNaoConfigurado() {
      return provider.mensagemNaoConfigurado();
    },
    emitir(body) {
      return provider.emitir(body, creds());
    },
    consultar(idProvedor) {
      return provider.consultar(idProvedor, creds());
    },
    cancelar(idProvedor, body) {
      return provider.cancelar(idProvedor, body, creds());
    },
    baixarPdf(idProvedor) {
      return provider.baixarPdf(idProvedor, creds());
    },
    baixarXml(idProvedor, tipo) {
      return provider.baixarXml(idProvedor, tipo, creds());
    },
  };
}

export async function resolveFiscalProvider(args = {}) {
  let configuracoes = args.configuracoes;
  if (configuracoes == null && args.tenantId) {
    configuracoes = await carregarConfiguracoesTenant(args.tenantId);
  }
  return getFiscalProvider({ ...args, configuracoes });
}

export { FISCAL_PROVIDERS, resolveFiscalProviderId } from "../constants.js";
