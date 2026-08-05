/**
 * Provedor fiscal: Notaas (API Key).
 * Docs: https://docs.notaas.com.br — migração: docs/MIGRACAO_NOTAAS.md
 *
 * Preferir variáveis NOTAAS_* (fallback legado ACBR_API_* / NUVEM_FISCAL_* para params fiscais).
 *
 * Painel web (platform.notaas.com.br) — não duplicar no .env:
 * - Dados da empresa, certificado A1, ambiente, código de serviço padrão.
 *
 * Backend (.env):
 * - NOTAAS_API_KEY — Project Key (prefixo ntaas_)
 * - NOTAAS_API_URL — default https://platform.notaas.com.br/api/v1
 * - NOTAAS_CNPJ_EMITENTE, NOTAAS_C_TRIB_NAC, NOTAAS_CODIGO_MUNICIPIO_IBGE, etc.
 *
 * Teste: npm run test-notaas
 */

export const PROVEDOR_FISCAL_ID = "notaas";
export const PROVEDOR_FISCAL_LABEL = "Notaas";

const DEFAULT_API_BASE = "https://platform.notaas.com.br/api/v1";

/** Lê a primeira env não vazia. */
function envFirst(...keys) {
  for (const key of keys) {
    const v = process.env[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function normalizeInscricaoEstadual(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^isento$/i.test(raw)) return "ISENTO";
  return raw.replace(/\D/g, "");
}

function parseAliquota(envVal, fallback) {
  const n = parseFloat(String(envVal ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function resolveAmbiente() {
  const a = envFirst(
    "NOTAAS_AMBIENTE",
    "ACBR_API_AMBIENTE",
    "NUVEM_FISCAL_AMBIENTE",
  ).toLowerCase();
  return a === "producao" ? "producao" : "homologacao";
}

/**
 * Config efetiva do provedor fiscal (Notaas).
 * Mantém o nome getNuvemFiscalConfig por compatibilidade com imports existentes.
 */
export function getNuvemFiscalConfig() {
  const ambiente = resolveAmbiente();
  const empresaCnpj = envFirst(
    "NOTAAS_CNPJ_EMITENTE",
    "ACBR_API_CNPJ_EMITENTE",
    "NUVEM_FISCAL_CNPJ_EMITENTE",
  ).replace(/\D/g, "");
  const cTribNac = envFirst(
    "NOTAAS_C_TRIB_NAC",
    "ACBR_API_C_TRIB_NAC",
    "NUVEM_FISCAL_C_TRIB_NAC",
    "310103",
  ).replace(/\D/g, "");
  const cNbsRaw = envFirst(
    "NOTAAS_C_NBS",
    "ACBR_API_C_NBS",
    "NUVEM_FISCAL_C_NBS",
    "120013110",
  ).replace(/\D/g, "");
  // NBS oficial: 9 dígitos (aceita 10 por typo legado e trunca)
  const cNbs =
    cNbsRaw.length >= 9 ? cNbsRaw.slice(0, 9) : "120013110";
  const codigoMunicipioIbge = envFirst(
    "NOTAAS_CODIGO_MUNICIPIO_IBGE",
    "ACBR_API_CODIGO_MUNICIPIO_IBGE",
    "NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE",
  ).replace(/\D/g, "");

  const apiKey = envFirst("NOTAAS_API_KEY");
  const explicitApiUrl = envFirst("NOTAAS_API_URL");

  return {
    provedorId: PROVEDOR_FISCAL_ID,
    provedorLabel: PROVEDOR_FISCAL_LABEL,
    apiKey,
    apiBaseUrl: (explicitApiUrl || DEFAULT_API_BASE).replace(/\/+$/, ""),
    empresaCnpj,
    ambiente,
    cTribNac: cTribNac.length === 6 ? cTribNac : "310103",
    cNbs,
    codigoMunicipioIbge:
      codigoMunicipioIbge.length === 7 ? codigoMunicipioIbge : "",
    tomadorCpfFallback: envFirst(
      "NOTAAS_TOMADOR_CPF",
      "ACBR_API_TOMADOR_CPF",
      "NUVEM_FISCAL_TOMADOR_CPF",
    ).replace(/\D/g, ""),
    tomadorCnpjFallback: envFirst(
      "NOTAAS_TOMADOR_CNPJ",
      "ACBR_API_TOMADOR_CNPJ",
      "NUVEM_FISCAL_TOMADOR_CNPJ",
    ).replace(/\D/g, ""),
    tomadorCepFallback: envFirst(
      "NOTAAS_TOMADOR_CEP",
      "ACBR_API_TOMADOR_CEP",
      "NUVEM_FISCAL_TOMADOR_CEP",
    ).replace(/\D/g, ""),
    tomadorCMunFallback: envFirst(
      "NOTAAS_TOMADOR_C_MUN",
      "ACBR_API_TOMADOR_C_MUN",
      "NUVEM_FISCAL_TOMADOR_C_MUN",
    ).replace(/\D/g, ""),
    aliquotaIss: parseAliquota(
      envFirst(
        "NOTAAS_ALIQUOTA_ISS",
        "ACBR_API_ALIQUOTA_ISS",
        "NUVEM_FISCAL_ALIQUOTA_ISS",
      ),
      2,
    ),
    aliquotaPis: parseAliquota(
      envFirst(
        "NOTAAS_ALIQUOTA_PIS",
        "ACBR_API_ALIQUOTA_PIS",
        "NUVEM_FISCAL_ALIQUOTA_PIS",
      ),
      0,
    ),
    aliquotaCofins: parseAliquota(
      envFirst(
        "NOTAAS_ALIQUOTA_COFINS",
        "ACBR_API_ALIQUOTA_COFINS",
        "NUVEM_FISCAL_ALIQUOTA_COFINS",
      ),
      0,
    ),
    tpRetISSQN:
      parseInt(
        envFirst(
          "NOTAAS_TP_RET_ISSQN",
          "ACBR_API_TP_RET_ISSQN",
          "NUVEM_FISCAL_TP_RET_ISSQN",
          "1",
        ),
        10,
      ) || 1,
    issRetido:
      envFirst("NOTAAS_ISS_RETIDO", "ACBR_API_ISS_RETIDO").toLowerCase() ===
        "true" ||
      envFirst("NOTAAS_ISS_RETIDO", "ACBR_API_ISS_RETIDO") === "1",
    // Campos NF-e legados (NF-e Notaas ainda não integrada)
    cuf:
      parseInt(
        envFirst("NOTAAS_CUF", "ACBR_API_CUF", "NUVEM_FISCAL_CUF", "41"),
        10,
      ) || 41,
    nfeCfop: envFirst(
      "NOTAAS_NFE_CFOP",
      "ACBR_API_NFE_CFOP",
      "NUVEM_FISCAL_NFE_CFOP",
      "5102",
    ).replace(/\D/g, ""),
    nfeCsosn: envFirst(
      "NOTAAS_NFE_CSOSN",
      "ACBR_API_NFE_CSOSN",
      "NUVEM_FISCAL_NFE_CSOSN",
      "103",
    ).replace(/\D/g, ""),
    nfeNcm: envFirst(
      "NOTAAS_NFE_NCM",
      "ACBR_API_NFE_NCM",
      "NUVEM_FISCAL_NFE_NCM",
      "87089990",
    ).replace(/\D/g, ""),
    emitenteIe: normalizeInscricaoEstadual(
      envFirst(
        "NOTAAS_EMITENTE_IE",
        "ACBR_API_EMITENTE_IE",
        "NUVEM_FISCAL_EMITENTE_IE",
        "NUVEM_FISCAL_NFE_IE",
      ),
    ),
    nfeCrt:
      parseInt(
        envFirst("NOTAAS_NFE_CRT", "ACBR_API_NFE_CRT", "NUVEM_FISCAL_NFE_CRT", "1"),
        10,
      ) || 1,
    nfeSerie:
      parseInt(
        envFirst(
          "NOTAAS_NFE_SERIE",
          "ACBR_API_NFE_SERIE",
          "NUVEM_FISCAL_NFE_SERIE",
          "1",
        ),
        10,
      ) || 1,
    nfeNumeroInicial:
      parseInt(
        envFirst(
          "NOTAAS_NFE_NUMERO_INICIAL",
          "ACBR_API_NFE_NUMERO_INICIAL",
          "NUVEM_FISCAL_NFE_NUMERO_INICIAL",
          "1",
        ),
        10,
      ) || 1,
    nfeNatOp:
      envFirst("NOTAAS_NFE_NAT_OP", "ACBR_API_NFE_NAT_OP", "NUVEM_FISCAL_NFE_NAT_OP") ||
      "VENDA DE MERCADORIA ADQUIRIDA",
    respTecCnpj: envFirst(
      "NOTAAS_RESP_TEC_CNPJ",
      "ACBR_API_RESP_TEC_CNPJ",
      "NUVEM_FISCAL_RESP_TEC_CNPJ",
    ).replace(/\D/g, ""),
    respTecContato: envFirst(
      "NOTAAS_RESP_TEC_CONTATO",
      "ACBR_API_RESP_TEC_CONTATO",
      "NUVEM_FISCAL_RESP_TEC_CONTATO",
    ),
    respTecEmail: envFirst(
      "NOTAAS_RESP_TEC_EMAIL",
      "ACBR_API_RESP_TEC_EMAIL",
      "NUVEM_FISCAL_RESP_TEC_EMAIL",
    ),
    respTecFone: envFirst(
      "NOTAAS_RESP_TEC_FONE",
      "ACBR_API_RESP_TEC_FONE",
      "NUVEM_FISCAL_RESP_TEC_FONE",
    ).replace(/\D/g, ""),
    respTecCsrtId:
      parseInt(
        envFirst(
          "NOTAAS_RESP_TEC_CSRT_ID",
          "ACBR_API_RESP_TEC_CSRT_ID",
          "NUVEM_FISCAL_RESP_TEC_CSRT_ID",
          "0",
        ),
        10,
      ) || 0,
    respTecCsrt: envFirst(
      "NOTAAS_RESP_TEC_CSRT",
      "ACBR_API_RESP_TEC_CSRT",
      "NUVEM_FISCAL_RESP_TEC_CSRT",
    ),
  };
}

/** Alias semântico para novos callers. */
export const getFiscalProviderConfig = getNuvemFiscalConfig;

export function isNuvemFiscalConfigured() {
  const c = getNuvemFiscalConfig();
  return !!(c.apiKey && c.apiKey.startsWith("ntaas_"));
}

export const isFiscalProviderConfigured = isNuvemFiscalConfigured;

/** NF-e de peças — desabilitada por padrão (Notaas NF-e ainda não integrada). */
export function isNfeEmissaoHabilitada() {
  const v = envFirst(
    "NOTAAS_NFE_ENABLED",
    "ACBR_API_NFE_ENABLED",
    "NUVEM_FISCAL_NFE_ENABLED",
  ).toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function mensagemNfeDesabilitada() {
  return "Emissão de NF-e (peças) está desativada. Use NFS-e para serviços (e peças, enquanto a NF-e estiver desligada).";
}

/**
 * NFS-e com peças + serviços na mesma nota (enquanto NF-e estiver desligada).
 * Override: NOTAAS_NFSE_INCLUIR_PECAS / ACBR_API_* / NUVEM_FISCAL_* = 1|0
 */
export function isNfseIncluirPecas() {
  const v = envFirst(
    "NOTAAS_NFSE_INCLUIR_PECAS",
    "ACBR_API_NFSE_INCLUIR_PECAS",
    "NUVEM_FISCAL_NFSE_INCLUIR_PECAS",
  ).toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  return !isNfeEmissaoHabilitada();
}

export { normalizeInscricaoEstadual };
