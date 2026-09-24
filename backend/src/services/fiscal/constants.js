/** Identificadores persistidos em notas_fiscais.provedor */
export const FISCAL_PROVIDERS = {
  NOTAAS: "notaas",
  BRASIL_NFE: "brasil_nfe",
};

const LEGADO_NOTAAS = new Set([
  "notaas",
  "nuvem_fiscal",
  "nuvem",
  "acbr",
  "acbr_api",
]);

export function normalizarModeloDocumento(modeloDocumento) {
  return String(modeloDocumento || "NFSE").toUpperCase() === "NFE" ? "NFE" : "NFSE";
}

/**
 * Provider da operação.
 * Valor persistido válido ganha. NULL cai no modelo.
 * NF-e gravada como "notaas"/legado (bug antigo) resolve para brasil_nfe.
 */
export function resolveFiscalProviderId({ modeloDocumento, provedor } = {}) {
  const modelo = normalizarModeloDocumento(modeloDocumento);
  const p = String(provedor || "").trim().toLowerCase();

  if (!p) {
    return modelo === "NFE" ? FISCAL_PROVIDERS.BRASIL_NFE : FISCAL_PROVIDERS.NOTAAS;
  }
  if (p === FISCAL_PROVIDERS.BRASIL_NFE) return FISCAL_PROVIDERS.BRASIL_NFE;
  if (LEGADO_NOTAAS.has(p) && modelo === "NFSE") return FISCAL_PROVIDERS.NOTAAS;
  if (modelo === "NFE") return FISCAL_PROVIDERS.BRASIL_NFE;
  if (p === FISCAL_PROVIDERS.NOTAAS) return FISCAL_PROVIDERS.NOTAAS;
  return FISCAL_PROVIDERS.NOTAAS;
}

export function rotuloProvider(providerId) {
  return providerId === FISCAL_PROVIDERS.BRASIL_NFE ? "Brasil NFe" : "Notaas";
}
