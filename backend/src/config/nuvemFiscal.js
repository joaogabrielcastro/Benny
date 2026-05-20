/**
 * Integração Nuvem Fiscal (NFS-e via POST /nfse/dps).
 *
 * O que fica no PAINEL Nuvem Fiscal (web) — não duplicar no .env salvo indicação da doc:
 * - Aba Dados: razão social, CNPJ, endereço, e-mail (espelha o cadastro da empresa).
 * - Aba Certificado: certificado A1 instalado (obrigatório para assinatura / transmissão).
 * - Aba Serviços → NFS-e: ambiente Homologação, lote/série/RPS, regime Simples Nacional,
 *   login/senha/token da prefeitura quando o município exigir. Clique em "Atualizar Configuração".
 * - Aba Serviços → NF-e: ambiente Homologação e CRT (ex.: Simples Nacional), se for usar NF-e.
 *
 * O que fica no backend (.env) — credenciais da API OAuth2 e parâmetros usados pelo Benny ao montar a DPS:
 * - NUVEM_FISCAL_CLIENT_ID / NUVEM_FISCAL_CLIENT_SECRET — criados em https://console.nuvemfiscal.com.br
 *   → Credenciais de API (Produção ou Sandbox; não use ID de outra tela do painel da empresa).
 * - Credencial Sandbox → use NUVEM_FISCAL_API_URL=https://api.sandbox.nuvemfiscal.com.br (produção: default api.nuvemfiscal.com.br).
 * - NUVEM_FISCAL_CNPJ_EMITENTE (14 dígitos; mesmo CNPJ da empresa na Nuvem Fiscal)
 * - NUVEM_FISCAL_AMBIENTE=homologacao (testes) ou producao
 * - NUVEM_FISCAL_PROVEDOR: padrao | nacional (default nacional — ADN)
 * - NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE: 7 dígitos (ex. Colombo/PR 4105805 — local da prestação no JSON)
 * - NUVEM_FISCAL_C_TRIB_NAC: código nacional ISSQN, 6 dígitos (ajuste ao serviço; default 140101)
 * - NUVEM_FISCAL_C_NBS: Nomenclatura Brasileira de Serviços, 9 dígitos (obrigatório no layout Nacional; default 120013110 = manutenção/reparação veículos — ajuste pela tabela do município/Anexo VIII)
 * - NUVEM_FISCAL_ALIQUOTA_ISS: % ISS na DPS e na tela (ex.: 2 para Colombo)
 * - Simples Nacional (opSimpNac / regApTribSN): configure no PAINEL Nuvem Fiscal
 *   (empresa → Serviços → NFS-e → regime tributário), não no JSON da DPS nacional.
 * - NUVEM_FISCAL_REG_ESP_TRIB: regime especial na DPS (0 = nenhum; default 0)
 * - NUVEM_FISCAL_ALIQUOTA_PIS / NUVEM_FISCAL_ALIQUOTA_COFINS: opcionais (0 = não estimar)
 * - NF-e (peças): NUVEM_FISCAL_NFE_CFOP (5102 ou 5405), NUVEM_FISCAL_NFE_CSOSN (103),
 *   NUVEM_FISCAL_NFE_NCM (8 dígitos), NUVEM_FISCAL_NFE_SERIE, NUVEM_FISCAL_CUF (41 = PR)
 * - NUVEM_FISCAL_AUTH_URL / NUVEM_FISCAL_API_URL / NUVEM_FISCAL_SCOPE (opcionais; veja defaults abaixo)
 * - NUVEM_FISCAL_TOMADOR_CPF / NUVEM_FISCAL_TOMADOR_CNPJ / NUVEM_FISCAL_TOMADOR_CEP / NUVEM_FISCAL_TOMADOR_C_MUN:
 *   fallbacks para OS de teste quando o cliente ainda não tiver documento ou CEP completos.
 *
 * Teste rápido OAuth: na pasta backend, `npm run test-nuvem-fiscal`.
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
  const cNbs = (process.env.NUVEM_FISCAL_C_NBS || "120013110").replace(
    /\D/g,
    "",
  );
  const codigoMunicipioIbge = (
    process.env.NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE || ""
  ).replace(/\D/g, "");
  const parseAliquota = (envVal, fallback) => {
    const n = parseFloat(String(envVal ?? "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    authUrl:
      process.env.NUVEM_FISCAL_AUTH_URL ||
      "https://auth.nuvemfiscal.com.br/oauth/token",
    apiBaseUrl:
      process.env.NUVEM_FISCAL_API_URL || "https://api.nuvemfiscal.com.br",
    clientId: String(process.env.NUVEM_FISCAL_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.NUVEM_FISCAL_CLIENT_SECRET || "").trim(),
    empresaCnpj,
    scope: String(
      process.env.NUVEM_FISCAL_SCOPE ||
        "conta empresa cep cnpj nfse nfe nfce",
    ).trim(),
    ambiente,
    provedor,
    cTribNac: cTribNac.length === 6 ? cTribNac : "140101",
    /** NBS — 9 dígitos (layout Nacional / reforma tributária) */
    cNbs: cNbs.length === 9 ? cNbs : "120013110",
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
    /** % ISS enviado na DPS (tribMun) e usado na estimativa da tela */
    aliquotaIss: parseAliquota(process.env.NUVEM_FISCAL_ALIQUOTA_ISS, 2),
    /** Regime especial tributação na DPS (Padrão Nacional): 0 = nenhum */
    regEspTrib: parseInt(process.env.NUVEM_FISCAL_REG_ESP_TRIB || "0", 10) || 0,
    aliquotaPis: parseAliquota(process.env.NUVEM_FISCAL_ALIQUOTA_PIS, 0),
    aliquotaCofins: parseAliquota(process.env.NUVEM_FISCAL_ALIQUOTA_COFINS, 0),
    cuf: parseInt(process.env.NUVEM_FISCAL_CUF || "41", 10) || 41,
    nfeCfop: (process.env.NUVEM_FISCAL_NFE_CFOP || "5102").replace(/\D/g, ""),
    nfeCsosn: (process.env.NUVEM_FISCAL_NFE_CSOSN || "103").replace(/\D/g, ""),
    nfeNcm: (process.env.NUVEM_FISCAL_NFE_NCM || "87089990").replace(/\D/g, ""),
    nfeSerie: parseInt(process.env.NUVEM_FISCAL_NFE_SERIE || "1", 10) || 1,
    nfeNatOp:
      process.env.NUVEM_FISCAL_NFE_NAT_OP || "VENDA DE MERCADORIA ADQUIRIDA",
  };
}

export function isNuvemFiscalConfigured() {
  const c = getNuvemFiscalConfig();
  return !!(c.clientId && c.clientSecret && c.empresaCnpj.length === 14);
}
