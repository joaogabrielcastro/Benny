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
 * - NUVEM_FISCAL_C_TRIB_NAC: código nacional ISSQN, 6 dígitos (Colombo/Bennys: 310103 = 31.01.03 mecânica)
 * - NUVEM_FISCAL_C_NBS: Nomenclatura Brasileira de Serviços, 9 dígitos (Colombo/Bennys: 1200131110)
 * - NUVEM_FISCAL_ALIQUOTA_ISS: % ISS na DPS e na tela (ex.: 2 para Colombo)
 * - Simples Nacional (opSimpNac / regApTribSN): configure no PAINEL Nuvem Fiscal
 *   (empresa → Serviços → NFS-e → regime tributário), não no JSON da DPS nacional.
 * - NUVEM_FISCAL_REG_ESP_TRIB: regime especial na DPS (0 = nenhum; default 0)
 * - NUVEM_FISCAL_ALIQUOTA_PIS / NUVEM_FISCAL_ALIQUOTA_COFINS: opcionais (0 = não estimar)
 * - NF-e (peças): NUVEM_FISCAL_EMITENTE_IE (obrigatório na SEFAZ), NUVEM_FISCAL_NFE_CRT (1=Simples),
 *   NUVEM_FISCAL_NFE_CFOP (5102), NUVEM_FISCAL_NFE_CSOSN (103), NUVEM_FISCAL_NFE_NCM, série, CUF
 * - NF-e PR (NT 2018.005): NUVEM_FISCAL_RESP_TEC_CNPJ, _CONTATO, _EMAIL, _FONE (infRespTec — obrigatório)
 *   PR também exige CSRT: NUVEM_FISCAL_RESP_TEC_CSRT_ID + NUVEM_FISCAL_RESP_TEC_CSRT (token UPD/Receita PR; Nuvem calcula hashCSRT)
 * - NUVEM_FISCAL_AUTH_URL / NUVEM_FISCAL_API_URL / NUVEM_FISCAL_SCOPE (opcionais; veja defaults abaixo)
 * - NUVEM_FISCAL_TOMADOR_CPF / NUVEM_FISCAL_TOMADOR_CNPJ / NUVEM_FISCAL_TOMADOR_CEP / NUVEM_FISCAL_TOMADOR_C_MUN:
 *   fallbacks para OS de teste quando o cliente ainda não tiver documento ou CEP completos.
 *
 * Teste rápido OAuth: na pasta backend, `npm run test-nuvem-fiscal`.
 */

function normalizeInscricaoEstadual(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^isento$/i.test(raw)) return "ISENTO";
  return raw.replace(/\D/g, "");
}

export function getNuvemFiscalConfig() {
  const empresaCnpj = (process.env.NUVEM_FISCAL_CNPJ_EMITENTE || "").replace(
    /\D/g,
    "",
  );
  const ambiente = process.env.NUVEM_FISCAL_AMBIENTE || "homologacao";
  const provedor = process.env.NUVEM_FISCAL_PROVEDOR || "nacional";
  const cTribNac = (process.env.NUVEM_FISCAL_C_TRIB_NAC || "310103").replace(
    /\D/g,
    "",
  );
  const cNbs = (process.env.NUVEM_FISCAL_C_NBS || "1200131110").replace(
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
    /**
     * % ISS — estimativa na tela. Na DPS (ME/EPP + Simples + tpRetISSQN=1) não vai pAliq/vBC/vISSQN.
     * tpRetISSQN: 1 = sem retenção (padrão oficina), 2 = retido pelo tomador.
     */
    aliquotaIss: parseAliquota(process.env.NUVEM_FISCAL_ALIQUOTA_ISS, 2),
    tpRetISSQN: parseInt(process.env.NUVEM_FISCAL_TP_RET_ISSQN || "1", 10) || 1,
    /** Só true se precisar forçar pAliq na DPS com tpRetISSQN=1 (raro; pode gerar rejeição ADN). */
    forcarAliquotaIssDps:
      String(process.env.NUVEM_FISCAL_FORCAR_ALIQ_ISS_DPS || "")
        .trim()
        .toLowerCase() === "true",
    /** Regime especial tributação na DPS (Padrão Nacional): 0 = nenhum */
    regEspTrib: parseInt(process.env.NUVEM_FISCAL_REG_ESP_TRIB || "0", 10) || 0,
    aliquotaPis: parseAliquota(process.env.NUVEM_FISCAL_ALIQUOTA_PIS, 0),
    aliquotaCofins: parseAliquota(process.env.NUVEM_FISCAL_ALIQUOTA_COFINS, 0),
    cuf: parseInt(process.env.NUVEM_FISCAL_CUF || "41", 10) || 41,
    nfeCfop: (process.env.NUVEM_FISCAL_NFE_CFOP || "5102").replace(/\D/g, ""),
    nfeCsosn: (process.env.NUVEM_FISCAL_NFE_CSOSN || "103").replace(/\D/g, ""),
    nfeNcm: (process.env.NUVEM_FISCAL_NFE_NCM || "87089990").replace(/\D/g, ""),
    /** Inscrição Estadual do emitente (obrigatória na NF-e). Use ISENTO se aplicável. */
    emitenteIe: normalizeInscricaoEstadual(
      process.env.NUVEM_FISCAL_EMITENTE_IE ||
        process.env.NUVEM_FISCAL_NFE_IE ||
        "",
    ),
    /** CRT NF-e: 1 = Simples Nacional (padrão oficina ME/EPP) */
    nfeCrt: parseInt(process.env.NUVEM_FISCAL_NFE_CRT || "1", 10) || 1,
    nfeSerie: parseInt(process.env.NUVEM_FISCAL_NFE_SERIE || "1", 10) || 1,
    /** Próximo nNF se ainda não houver NF-e emitida pelo Benny (alinhar ao último número na SEFAZ). */
    nfeNumeroInicial:
      parseInt(process.env.NUVEM_FISCAL_NFE_NUMERO_INICIAL || "1", 10) || 1,
    nfeNatOp:
      process.env.NUVEM_FISCAL_NFE_NAT_OP || "VENDA DE MERCADORIA ADQUIRIDA",
    /** Responsável técnico do ERP (infRespTec) — CNPJ do desenvolvedor do software, não da oficina */
    respTecCnpj: (process.env.NUVEM_FISCAL_RESP_TEC_CNPJ || "").replace(
      /\D/g,
      "",
    ),
    respTecContato: String(
      process.env.NUVEM_FISCAL_RESP_TEC_CONTATO || "",
    ).trim(),
    respTecEmail: String(process.env.NUVEM_FISCAL_RESP_TEC_EMAIL || "").trim(),
    respTecFone: (process.env.NUVEM_FISCAL_RESP_TEC_FONE || "").replace(
      /\D/g,
      "",
    ),
    respTecCsrtId: parseInt(
      process.env.NUVEM_FISCAL_RESP_TEC_CSRT_ID || "0",
      10,
    ) || 0,
    respTecCsrt: String(process.env.NUVEM_FISCAL_RESP_TEC_CSRT || "").trim(),
  };
}

export function isNuvemFiscalConfigured() {
  const c = getNuvemFiscalConfig();
  return !!(c.clientId && c.clientSecret && c.empresaCnpj.length === 14);
}

/** NF-e de peças — desligada até credenciamento SEFAZ/PR (CSRT). Ativar: NUVEM_FISCAL_NFE_ENABLED=1 */
export function isNfeEmissaoHabilitada() {
  const v = String(process.env.NUVEM_FISCAL_NFE_ENABLED || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function mensagemNfeDesabilitada() {
  return "Emissão de NF-e (peças) está desativada. Aguardando credenciamento na SEFAZ/PR (CSRT). Use NFS-e para serviços.";
}

/**
 * NFS-e com peças + serviços na mesma nota (enquanto NF-e estiver desligada).
 * Override: NUVEM_FISCAL_NFSE_INCLUIR_PECAS=1|0
 */
export function isNfseIncluirPecas() {
  const v = String(process.env.NUVEM_FISCAL_NFSE_INCLUIR_PECAS || "")
    .trim()
    .toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return !isNfeEmissaoHabilitada();
}
