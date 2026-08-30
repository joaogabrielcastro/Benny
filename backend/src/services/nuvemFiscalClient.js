import axios from "axios";
import {
  getNuvemFiscalConfig,
  isNuvemFiscalConfigured,
} from "../config/nuvemFiscal.js";
import logger from "../config/logger.js";
import { isNuvemFilaProcessamento } from "./notasFiscais/nuvemNotaNaoEncontrada.js";

const MSG_NFE_NAO_INTEGRADA =
  "NF-e via Notaas ainda não está integrada neste servidor. Use NFS-e.";

function apiHeaders(apiKey) {
  return {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function formatarErroApi(err) {
  const status = err.response?.status;
  const data = err.response?.data;
  if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
    const buf = Buffer.from(data);
    try {
      const parsed = JSON.parse(buf.toString("utf8"));
      return formatarErroApi({ response: { status, data: parsed } });
    } catch {
      const snippet = buf.toString("utf8", 0, 200).trim();
      if (snippet) return `Notaas HTTP ${status || "?"}: ${snippet}`;
    }
  }
  if (data && typeof data === "object" && !(data instanceof ArrayBuffer)) {
    const msgs =
      data.errorMessage ||
      data.message ||
      data.error ||
      data.errors ||
      data.mensagens;
    let texto;
    if (Array.isArray(msgs)) {
      texto = msgs
        .map(
          (m) =>
            m.Descricao ||
            m.descricao ||
            m.message ||
            m.errorMessage ||
            JSON.stringify(m),
        )
        .join("; ");
    } else if (typeof msgs === "object" && msgs !== null) {
      texto = msgs.message || msgs.errorMessage || JSON.stringify(msgs);
    } else {
      texto = typeof msgs === "string" ? msgs : JSON.stringify(data);
    }
    return `Notaas HTTP ${status || "?"}: ${texto}`;
  }
  return err.message || "Erro desconhecido na Notaas";
}

/**
 * Requisição JSON autenticada à Notaas.
 * @returns {Promise<{ ok: true, data: object, statusCode: number } | { ok: false, mensagem: string, statusCode?: number, detalhe?: unknown, authError?: boolean }>}
 */
async function requestNotaas(method, path, body) {
  if (!isNuvemFiscalConfigured()) {
    return { ok: false, mensagem: "Notaas não configurada (NOTAAS_API_KEY)" };
  }
  const cfg = getNuvemFiscalConfig();
  const base = String(cfg.apiBaseUrl || "").replace(/\/+$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const { data, status } = await axios({
      method,
      url,
      data: body,
      headers: apiHeaders(cfg.apiKey),
      timeout: 120_000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    return { ok: true, data, statusCode: status };
  } catch (err) {
    const result = {
      ok: false,
      mensagem: formatarErroApi(err),
      statusCode: err.response?.status,
      detalhe: err.response?.data,
      authError:
        err.response?.status === 401 || err.response?.status === 403,
    };
    if (isNuvemFilaProcessamento(result)) {
      logger.debug(`Notaas: ${method} ${path} — nota em processamento`);
    } else {
      logger.error(
        `Notaas: ${method} ${path} falhou`,
        err.response?.data || err.message,
      );
    }
    return result;
  }
}

/** GET binário (PDF/XML) — segue redirects 302/307 */
async function requestNotaasBinary(
  path,
  redirectUrl = null,
  hops = 0,
  { accept = "application/pdf", kind = "pdf" } = {},
) {
  if (!isNuvemFiscalConfigured()) {
    return { ok: false, mensagem: "Notaas não configurada (NOTAAS_API_KEY)" };
  }
  if (hops > 6) {
    return { ok: false, mensagem: "Muitos redirects ao baixar PDF na Notaas." };
  }
  const cfg = getNuvemFiscalConfig();
  const base = String(cfg.apiBaseUrl || "").replace(/\/+$/, "");
  const url =
    redirectUrl ||
    `${base}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const response = await axios({
      method: "GET",
      url,
      responseType: "arraybuffer",
      maxRedirects: 0,
      validateStatus: (s) => s === 200 || s === 302 || s === 307,
      headers: {
        "x-api-key": cfg.apiKey,
        Accept: accept,
      },
      timeout: 120_000,
      decompress: true,
    });

    if (response.status === 302 || response.status === 307) {
      const loc = response.headers?.location;
      if (!loc) {
        return {
          ok: false,
          mensagem: `Notaas redirecionou (${response.status}) sem URL do PDF.`,
        };
      }
      const next =
        loc.startsWith("http://") || loc.startsWith("https://")
          ? loc
          : `${base}${loc.startsWith("/") ? loc : `/${loc}`}`;
      return requestNotaasBinary(path, next, hops + 1, { accept, kind });
    }

    const buffer = Buffer.from(response.data);
    const head = buffer.subarray(0, 5).toString("utf8");
    if (kind === "xml") {
      if (!head.startsWith("<?xml") && !head.startsWith("<")) {
        const msg = formatarErroApi({
          response: { status: response.status, data: buffer },
        });
        return {
          ok: false,
          mensagem: msg.includes("Notaas")
            ? msg
            : "Notaas não retornou XML válido para esta nota.",
        };
      }
      return {
        ok: true,
        buffer,
        contentType: response.headers["content-type"] || "application/xml",
      };
    }

    if (head.slice(0, 4) !== "%PDF") {
      const msg = formatarErroApi({
        response: { status: response.status, data: buffer },
      });
      return {
        ok: false,
        mensagem: msg.includes("Notaas")
          ? msg
          : "Notaas não retornou PDF válido. A nota pode estar rejeitada ou em processamento.",
      };
    }
    return {
      ok: true,
      buffer,
      contentType: response.headers["content-type"] || "application/pdf",
    };
  } catch (err) {
    logger.error(
      `Notaas: GET ${path} (pdf) falhou`,
      err.response?.status,
      err.response?.data
        ? Buffer.from(err.response.data).toString("utf8", 0, 300)
        : err.message,
    );
    return {
      ok: false,
      mensagem: formatarErroApi(err),
      statusCode: err.response?.status,
      authError:
        err.response?.status === 401 || err.response?.status === 403,
    };
  }
}

/**
 * Valida a API Key sem emitir nota.
 * Key válida → tipicamente 404 no invoice fictício; inválida → 401/403.
 */
export async function testarConexao() {
  if (!isNuvemFiscalConfigured()) {
    return { ok: false, motivo: "NOTAAS_API_KEY ausente ou inválida (prefixo ntaas_)" };
  }
  const cfg = getNuvemFiscalConfig();
  const base = String(cfg.apiBaseUrl || "").replace(/\/+$/, "");
  try {
    const { status } = await axios.get(
      `${base}/invoices/inv_benny_auth_ping/status`,
      {
        headers: { "x-api-key": cfg.apiKey, Accept: "application/json" },
        timeout: 25_000,
        validateStatus: () => true,
      },
    );
    if (status === 401 || status === 403) {
      return {
        ok: false,
        motivo: `API Key rejeitada (HTTP ${status}). Verifique NOTAAS_API_KEY no Dashboard → API Keys.`,
      };
    }
    return { ok: true, httpStatus: status };
  } catch (e) {
    return { ok: false, motivo: e.message || "falha ao contactar Notaas" };
  }
}

/** Compat: callers antigos esperavam OAuth — Notaas usa API Key. */
export async function obterAccessToken() {
  if (!isNuvemFiscalConfigured()) {
    throw new Error(
      "Notaas: configure NOTAAS_API_KEY (prefixo ntaas_) no servidor",
    );
  }
  return getNuvemFiscalConfig().apiKey;
}

export async function baixarPdfNfse(idProvedor) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NFS-e na Notaas ausente" };
  return requestNotaasBinary(`/invoices/${encodeURIComponent(id)}/pdf`);
}

export async function baixarXmlNfse(idProvedor, tipo = "emission") {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NFS-e na Notaas ausente" };
  const query = tipo === "cancel" ? "?type=cancel" : "";
  return requestNotaasBinary(
    `/invoices/${encodeURIComponent(id)}/xml${query}`,
    null,
    0,
    { accept: "application/xml", kind: "xml" },
  );
}

export async function baixarPdfNfe() {
  return { ok: false, mensagem: MSG_NFE_NAO_INTEGRADA };
}

/** GET /invoices/{id}/status */
export async function consultarNfse(idProvedor) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NFS-e na Notaas ausente" };
  const res = await requestNotaas(
    "GET",
    `/invoices/${encodeURIComponent(id)}/status`,
  );
  if (res.ok && res.data && typeof res.data === "object") {
    // Garante invoiceId no objeto para o parser gravar id_provedor
    if (!res.data.invoiceId) res.data.invoiceId = id;
  }
  return res;
}

/** Notaas não tem sync SEFAZ separado — consulta o status. */
export async function sincronizarNfseNaPrefeitura(idProvedor) {
  return consultarNfse(idProvedor);
}

/**
 * Emite NFS-e via POST /emitir (nome legado emitirNfseDps).
 * Body no formato Notaas (tomador/servico/valores).
 */
export async function emitirNfseDps(body) {
  if (!isNuvemFiscalConfigured()) {
    return { ok: false, mensagem: "Notaas não configurada (NOTAAS_API_KEY)" };
  }
  return requestNotaas("POST", "/emitir", body);
}

export async function consultarNfe() {
  return { ok: false, mensagem: MSG_NFE_NAO_INTEGRADA };
}

export async function sincronizarNfeNaSefaz() {
  return { ok: false, mensagem: MSG_NFE_NAO_INTEGRADA };
}

export async function emitirNfe() {
  return { ok: false, mensagem: MSG_NFE_NAO_INTEGRADA };
}

/** POST /cancelar { invoiceId, motivo } */
export async function cancelarNfse(idProvedor, body = {}) {
  const id = String(idProvedor || "").trim();
  if (!id) return { ok: false, mensagem: "ID da NFS-e na Notaas ausente" };
  return requestNotaas("POST", "/cancelar", {
    invoiceId: id,
    motivo: String(body.motivo || body.justificativa || "")
      .trim()
      .slice(0, 255),
  });
}

export async function cancelarNfe() {
  return { ok: false, mensagem: MSG_NFE_NAO_INTEGRADA };
}
