import { getBrasilNfeConfig } from "../../config/brasilNfe.js";
import { getNuvemFiscalConfig } from "../../config/nuvemFiscal.js";
import { FISCAL_PROVIDERS } from "./constants.js";

/**
 * Resolve credencial sem gravar segredo em log, auditoria ou resposta.
 *
 * Ordem:
 * 1. tenants.configuracoes.fiscal.<provider>.token_env ou api_key_env
 *    (nome de variável de ambiente, não o segredo)
 * 2. ENV global do processo (NOTAAS_API_KEY / BRASILNFE_TOKEN)
 *
 * O JSON do tenant não deve conter o token em claro. Valor solto em
 * configuracoes.fiscal.*.token é ignorado.
 */
function blocoFiscal(configuracoes, provider) {
  const fiscal = configuracoes?.fiscal;
  if (!fiscal || typeof fiscal !== "object") return {};
  const bloco = fiscal[provider];
  return bloco && typeof bloco === "object" ? bloco : {};
}

function envNome(bloco, ...chaves) {
  for (const chave of chaves) {
    const nome = String(bloco[chave] || "").trim();
    if (/^[A-Z][A-Z0-9_]{2,80}$/.test(nome)) return nome;
  }
  return "";
}

export function getFiscalCredentials(tenantId, provider, configuracoes = null) {
  void tenantId;
  const bloco = blocoFiscal(configuracoes, provider);

  if (provider === FISCAL_PROVIDERS.BRASIL_NFE) {
    const cfg = getBrasilNfeConfig();
    const nome = envNome(bloco, "token_env", "tokenEnv");
    const doTenant = nome ? String(process.env[nome] || "").trim() : "";
    const token = doTenant || cfg.token;
    return {
      provider,
      configured: token.length > 0,
      token,
      apiBaseUrl: cfg.apiBaseUrl,
      tipoAmbiente: cfg.tipoAmbiente,
      ambiente: cfg.ambiente,
      origem: doTenant ? "tenant_env" : "env_global",
    };
  }

  const cfg = getNuvemFiscalConfig();
  const nome = envNome(bloco, "api_key_env", "apiKeyEnv");
  const doTenant = nome ? String(process.env[nome] || "").trim() : "";
  const apiKey = doTenant || cfg.apiKey;
  return {
    provider: FISCAL_PROVIDERS.NOTAAS,
    configured: !!(apiKey && apiKey.startsWith("ntaas_")),
    apiKey,
    apiBaseUrl: cfg.apiBaseUrl,
    ambiente: cfg.ambiente,
    origem: doTenant ? "tenant_env" : "env_global",
  };
}

export async function carregarConfiguracoesTenant(tenantId) {
  if (!tenantId) return {};
  try {
  const { default: pool } = await import("../../../database.js");
  const r = await pool.query(
    `SELECT configuracoes FROM tenants WHERE id = $1`,
    [tenantId],
  );
  const raw = r.rows[0]?.configuracoes;
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
  } catch {
    return {};
  }
}
