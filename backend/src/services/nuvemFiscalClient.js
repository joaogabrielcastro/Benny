import axios from "axios";
import {
  getNuvemFiscalConfig,
  isNuvemFiscalConfigured,
} from "../config/nuvemFiscal.js";
import logger from "../config/logger.js";
import { isNuvemFilaProcessamento } from "./notasFiscais/nuvemNotaNaoEncontrada.js";

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
  if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
    const buf = Buffer.from(data);
    try {
      const parsed = JSON.parse(buf.toString("utf8"));
      const fakeErr = { response: { status, data: parsed } };
      return formatarErroApi(fakeErr);
    } catch {
      const snippet = buf.toString("utf8", 0, 200).trim();
      if (snippet) return `Nuvem Fiscal HTTP ${status || "?"}: ${snippet}`;
    }
  }
  if (data && typeof data === "object" && !(data instanceof ArrayBuffer)) {
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
async function requestNuvemFiscal(method, path, body) {
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
    const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const { data, status } = await axios({
      method,
      url,
      data: body,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 120_000,
    });
    return { ok: true, data, statusCode: status };
  } catch (err) {
    const result = {
      ok: false,
      mensagem: formatarErroApi(err),
      statusCode: err.response?.status,
      detalhe: err.response?.data,
      authError: err.response?.status === 401,
    };
    if (isNuvemFilaProcessamento(result)) {
      logger.debug(
        `Nuvem Fiscal: ${method} ${path} — nota na fila de processamento`,
      );
    } else {
      logger.error(
        `Nuvem Fiscal: ${method} ${path} falhou`,
        err.response?.data || err.message,
      );
    }
    return result;
  }
}

/** GET binário (PDF) — segue redirects 302/307 da Nuvem Fiscal */
async function requestNuvemFiscalBinary(path, redirectUrl = null, hops = 0) {
  if (!isNuvemFiscalConfigured()) {
    return { ok: false, mensagem: "Nuvem Fiscal não configurada" };
  }
  if (hops > 6) {
    return { ok: false, mensagem: "Muitos redirects ao baixar PDF na Nuvem Fiscal." };
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
    const url =
      redirectUrl ||
      `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await axios({
      method: "GET",
      url,
      responseType: "arraybuffer",
      maxRedirects: 0,
      validateStatus: (s) => s === 200 || s === 302 || s === 307,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
      timeout: 120_000,
      decompress: true,
    });

    if (response.status === 302 || response.status === 307) {
      const loc = response.headers?.location;
      if (!loc) {
        return {
          ok: false,
          mensagem: `Nuvem Fiscal redirecionou (${response.status}) sem URL do PDF.`,
        };
      }
      const next =
        loc.startsWith("http://") || loc.startsWith("https://")
          ? loc
          : `${base}${loc.startsWith("/") ? loc : `/${loc}`}`;
      return requestNuvemFiscalBinary(path, next, hops + 1);
    }

    const buffer = Buffer.from(response.data);
    const head = buffer.subarray(0, 4).toString("utf8");
    if (head !== "%PDF") {
      const msg = formatarErroApi({
        response: { status: response.status, data: buffer },
      });
      return {
        ok: false,
        mensagem:
          msg.includes("Nuvem Fiscal")
            ? msg
            : "Nuvem Fiscal não retornou PDF válido. A nota pode estar rejeitada ou em processamento.",
      };
    }
    return {
      ok: true,
      buffer,
      contentType: response.headers["content-type"] || "application/pdf",
    };
  } catch (err) {
    logger.error(
      `Nuvem Fiscal: GET ${path} (pdf) falhou`,
      err.response?.status,
      err.response?.data
        ? Buffer.from(err.response.data).toString("utf8", 0, 300)
        : err.message,
    );
    return {
      ok: false,
      mensagem: formatarErroApi(err),
      statusCode: err.response?.status,
      authError: err.response?.status === 401,
    };
  }
}

export async function baixarPdfNfse(idProvedor) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NFS-e na Nuvem Fiscal ausente" };
  return requestNuvemFiscalBinary(`/nfse/${encodeURIComponent(id)}/pdf`);
}

export async function baixarPdfNfe(idProvedor) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NF-e na Nuvem Fiscal ausente" };
  return requestNuvemFiscalBinary(`/nfe/${encodeURIComponent(id)}/pdf`);
}

/** GET /nfse/{id} — consulta status da NFS-e na Nuvem Fiscal */
export async function consultarNfse(idProvedor) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NFS-e na Nuvem Fiscal ausente" };
  return requestNuvemFiscal("GET", `/nfse/${encodeURIComponent(id)}`);
}

/** POST /nfse/{id}/sincronizar — força sincronização com a prefeitura/ADN */
export async function sincronizarNfseNaPrefeitura(idProvedor) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NFS-e na Nuvem Fiscal ausente" };
  return requestNuvemFiscal(
    "POST",
    `/nfse/${encodeURIComponent(id)}/sincronizar`,
  );
}

export async function emitirNfseDps(body) {
  if (!isNuvemFiscalConfigured()) {
    return { ok: false, mensagem: "Nuvem Fiscal não configurada" };
  }
  return requestNuvemFiscal("POST", "/nfse/dps", body);
}

export async function consultarNfe(idProvedor) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NF-e na Nuvem Fiscal ausente" };
  return requestNuvemFiscal("GET", `/nfe/${encodeURIComponent(id)}`);
}

export async function sincronizarNfeNaSefaz(idProvedor) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NF-e na Nuvem Fiscal ausente" };
  return requestNuvemFiscal(
    "POST",
    `/nfe/${encodeURIComponent(id)}/sincronizar`,
  );
}

export async function emitirNfe(body) {
  if (!isNuvemFiscalConfigured()) {
    return { ok: false, mensagem: "Nuvem Fiscal não configurada" };
  }
  return requestNuvemFiscal("POST", "/nfe", body);
}

/** POST /nfse/{id}/cancelamento */
export async function cancelarNfse(idProvedor, body = {}) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NFS-e na Nuvem Fiscal ausente" };
  return requestNuvemFiscal(
    "POST",
    `/nfse/${encodeURIComponent(id)}/cancelamento`,
    body,
  );
}

/** POST /nfe/{id}/cancelamento */
export async function cancelarNfe(idProvedor, body = {}) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NF-e na Nuvem Fiscal ausente" };
  return requestNuvemFiscal(
    "POST",
    `/nfe/${encodeURIComponent(id)}/cancelamento`,
    body,
  );
}
