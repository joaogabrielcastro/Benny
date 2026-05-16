import axios from "axios";
import {
  getNuvemFiscalConfig,
  isNuvemFiscalConfigured,
} from "../config/nuvemFiscal.js";
import logger from "../config/logger.js";

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function clearTokenCache() {
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
}

/**
 * Obtém access_token OAuth2 (client_credentials) para a API Nuvem Fiscal.
 * @returns {Promise<string>}
 */
export async function obterAccessToken() {
  if (!isNuvemFiscalConfigured()) {
    throw new Error(
      "Nuvem Fiscal: configure NUVEM_FISCAL_CLIENT_ID, NUVEM_FISCAL_CLIENT_SECRET e NUVEM_FISCAL_CNPJ_EMITENTE",
    );
  }

  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt - 30_000) {
    return cachedAccessToken;
  }

  const cfg = getNuvemFiscalConfig();
  /** Formato recomendado na doc: client_id e client_secret no corpo (evita falhas de parse do Basic). */
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: cfg.scope,
  }).toString();

  try {
    const { data } = await axios.post(cfg.authUrl, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 25_000,
    });

    const token = data?.access_token;
    const expiresIn = Number(data?.expires_in || 3600);
    if (!token) {
      clearTokenCache();
      throw new Error("Nuvem Fiscal: resposta de token sem access_token");
    }
    cachedAccessToken = token;
    cachedAccessTokenExpiresAt = Date.now() + expiresIn * 1000;
    return token;
  } catch (err) {
    clearTokenCache();
    const detail = err.response?.data || err.message;
    logger.error("Nuvem Fiscal: falha ao obter token OAuth", detail);
    throw new Error(
      typeof detail === "string"
        ? detail
        : `Nuvem Fiscal: falha na autenticação (${err.response?.status || "sem status"})`,
    );
  }
}

export async function testarConexao() {
  if (!isNuvemFiscalConfigured()) {
    return { ok: false, motivo: "variáveis de ambiente incompletas" };
  }
  try {
    await obterAccessToken();
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: e.message || "falha na autenticação" };
  }
}

function formatarErroApi(err) {
  const status = err.response?.status;
  const data = err.response?.data;
  if (data && typeof data === "object") {
    const msgs = data.mensagens || data.message || data.error;
    const texto = Array.isArray(msgs)
      ? msgs.map((m) => m.descricao || m.message || JSON.stringify(m)).join("; ")
      : JSON.stringify(data);
    return `Nuvem Fiscal HTTP ${status || "?"}: ${texto}`;
  }
  return err.message || "Erro desconhecido na Nuvem Fiscal";
}

/**
 * Emite NFS-e via POST /nfse/dps.
 * @param {object} body — corpo NfseDpsPedidoEmissao (provedor, ambiente, referencia, infDPS)
 * @returns {Promise<{ ok: true, data: object, statusCode: number } | { ok: false, mensagem: string, statusCode?: number, detalhe?: unknown }>}
 */
export async function emitirNfseDps(body) {
  if (!isNuvemFiscalConfigured()) {
    return { ok: false, mensagem: "Nuvem Fiscal não configurada" };
  }
  let token;
  try {
    token = await obterAccessToken();
  } catch (e) {
    return {
      ok: false,
      mensagem: e.message || "Falha de autenticação OAuth",
      authError: true,
    };
  }
  try {
    const cfg = getNuvemFiscalConfig();
    const base = String(cfg.apiBaseUrl || "").replace(/\/+$/, "");
    const { data, status } = await axios.post(`${base}/nfse/dps`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 120_000,
    });
    return { ok: true, data, statusCode: status };
  } catch (err) {
    logger.error(
      "Nuvem Fiscal: POST /nfse/dps falhou",
      err.response?.data || err.message,
    );
    return {
      ok: false,
      mensagem: formatarErroApi(err),
      statusCode: err.response?.status,
      detalhe: err.response?.data,
    };
  }
}
