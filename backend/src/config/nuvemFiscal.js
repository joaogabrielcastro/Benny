/**
 * Integração Nuvem Fiscal (NFS-e / documentos).
 *
 * Variáveis de ambiente:
 * - NUVEM_FISCAL_CLIENT_ID
 * - NUVEM_FISCAL_CLIENT_SECRET
 * - NUVEM_FISCAL_CNPJ_EMITENTE (somente dígitos; CNPJ da empresa cadastrada na Nuvem Fiscal)
 * - NUVEM_FISCAL_AUTH_URL (opcional, default https://auth.nuvemfiscal.com.br/oauth/token)
 * - NUVEM_FISCAL_API_URL (opcional, default https://api.nuvemfiscal.com.br)
 * - NUVEM_FISCAL_SCOPE (opcional; escopos OAuth separados por espaço)
 * - NUVEM_FISCAL_AMBIENTE: homologacao | producao (default homologacao — sandbox)
 * - NUVEM_FISCAL_PROVEDOR: padrao | nacional (default nacional — ADN)
 * - NUVEM_FISCAL_C_TRIB_NAC: código tributação nacional ISSQN, 6 dígitos (ex.: 140101)
 * - NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE: 7 dígitos (local da prestação / endereço nacional)
 * - NUVEM_FISCAL_TOMADOR_CPF / NUVEM_FISCAL_TOMADOR_CNPJ: fallback se o cliente não tiver CPF/CNPJ
 * - NUVEM_FISCAL_TOMADOR_CEP / NUVEM_FISCAL_TOMADOR_C_MUN: fallback CEP e município IBGE do tomador
 */

export function getNuvemFiscalConfig() {
  const empresaCnpj = (process.env.NUVEM_FISCAL_CNPJ_EMITENTE || "").replace(
    /\D/g,
    "",
  );
  const ambiente = process.env.NUVEM_FISCAL_AMBIENTE || "homologacao";
  const provedor = process.env.NUVEM_FISCAL_PROVEDOR || "nacional";
  const cTribNac = (process.env.NUVEM_FISCAL_C_TRIB_NAC || "140101").replace(
    /\D/g,
    "",
  );
  const codigoMunicipioIbge = (
    process.env.NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE || ""
  ).replace(/\D/g, "");
  return {
    authUrl:
      process.env.NUVEM_FISCAL_AUTH_URL ||
      "https://auth.nuvemfiscal.com.br/oauth/token",
    apiBaseUrl:
      process.env.NUVEM_FISCAL_API_URL || "https://api.nuvemfiscal.com.br",
    clientId: process.env.NUVEM_FISCAL_CLIENT_ID || "",
    clientSecret: process.env.NUVEM_FISCAL_CLIENT_SECRET || "",
    empresaCnpj,
    scope:
      process.env.NUVEM_FISCAL_SCOPE ||
      "conta empresa cep cnpj nfse nfe nfce",
    ambiente,
    provedor,
    cTribNac: cTribNac.length === 6 ? cTribNac : "140101",
    codigoMunicipioIbge:
      codigoMunicipioIbge.length === 7 ? codigoMunicipioIbge : "",
    tomadorCpfFallback: (process.env.NUVEM_FISCAL_TOMADOR_CPF || "").replace(
      /\D/g,
      "",
    ),
    tomadorCnpjFallback: (
      process.env.NUVEM_FISCAL_TOMADOR_CNPJ || ""
    ).replace(/\D/g, ""),
    tomadorCepFallback: (process.env.NUVEM_FISCAL_TOMADOR_CEP || "").replace(
      /\D/g,
      "",
    ),
    tomadorCMunFallback: (
      process.env.NUVEM_FISCAL_TOMADOR_C_MUN || ""
    ).replace(/\D/g, ""),
  };
}

export function isNuvemFiscalConfigured() {
  const c = getNuvemFiscalConfig();
  return !!(c.clientId && c.clientSecret && c.empresaCnpj.length === 14);
}
