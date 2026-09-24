/**
 * NF-e modelo 55 via Brasil NFe.
 * NFS-e continua na Notaas.
 *
 * BRASILNFE_TOKEN — token da empresa no painel Brasil NFe
 * BRASILNFE_AMBIENTE — homologacao | producao (fallback: NOTAAS_AMBIENTE)
 */

const DEFAULT_API_BASE = "https://api.brasilnfe.com.br/services";

function envTrim(key) {
  const v = process.env[key];
  return v != null ? String(v).trim() : "";
}

export function getBrasilNfeConfig() {
  const ambienteRaw = (
    envTrim("BRASILNFE_AMBIENTE") ||
    envTrim("NOTAAS_AMBIENTE") ||
    "homologacao"
  ).toLowerCase();
  const producao = ambienteRaw === "producao" || ambienteRaw === "production" || ambienteRaw === "1";
  return {
    token: envTrim("BRASILNFE_TOKEN"),
    apiBaseUrl: (envTrim("BRASILNFE_API_URL") || DEFAULT_API_BASE).replace(/\/+$/, ""),
    tipoAmbiente: producao ? 1 : 2,
    ambiente: producao ? "producao" : "homologacao",
  };
}

export function isBrasilNfeConfigured() {
  return getBrasilNfeConfig().token.length > 0;
}
