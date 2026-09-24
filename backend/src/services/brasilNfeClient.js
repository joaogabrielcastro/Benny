import axios from "axios";
import {
  getBrasilNfeConfig,
  isBrasilNfeConfigured,
} from "../config/brasilNfe.js";
import logger from "../config/logger.js";

function mensagemErro(err) {
  const status = err.response?.status;
  const data = err.response?.data;
  if (typeof data === "string" && data.trim()) {
    return `Brasil NFe HTTP ${status || "?"}: ${data.trim().slice(0, 400)}`;
  }
  if (data && typeof data === "object") {
    const texto =
      data.Error ||
      data.error ||
      data.message ||
      data.Message ||
      data.ReturnNF?.DsStatusRespostaSefaz;
    if (texto) return `Brasil NFe HTTP ${status || "?"}: ${texto}`;
    return `Brasil NFe HTTP ${status || "?"}: ${JSON.stringify(data).slice(0, 400)}`;
  }
  return err.message || "Erro desconhecido na Brasil NFe";
}

/**
 * A emissão é síncrona. Normaliza o retorno para o parser de notas
 * e descarta PDF/XML em base64 (não gravar isso no banco).
 */
export function normalizarRespostaEmissao(data) {
  const ret = data?.ReturnNF && typeof data.ReturnNF === "object" ? data.ReturnNF : {};
  const cStat = ret.CodStatusRespostaSefaz != null ? Number(ret.CodStatusRespostaSefaz) : null;
  const chave = ret.ChaveNF || data?.ChaveNF || null;
  const autorizado = ret.Ok === true || cStat === 100 || cStat === 150;
  const erro = typeof data?.Error === "string" ? data.Error.trim() : "";
  return {
    status: autorizado ? "issued" : "error",
    invoiceId: chave,
    chaveAcesso: chave,
    nNf: ret.Numero ?? null,
    serie: ret.Serie ?? null,
    cStat,
    xMotivo: ret.DsStatusRespostaSefaz || erro || null,
    errorMessage: !autorizado && erro ? erro : undefined,
    numeroProtocolo: ret.NumeroProtocolo || null,
    issuedAt: autorizado ? new Date().toISOString() : null,
  };
}

async function postBrasil(metodo, body, creds) {
  const cfg = getBrasilNfeConfig();
  const token = creds?.token || cfg.token;
  const base = creds?.apiBaseUrl || cfg.apiBaseUrl;
  if (!token) {
    return { ok: false, mensagem: "Brasil NFe não configurada (BRASILNFE_TOKEN)" };
  }
  const url = `${base}/${metodo}`;
  try {
    const { data, status } = await axios.post(url, body, {
      headers: {
        Token: token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 180_000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    return { ok: true, data, statusCode: status };
  } catch (err) {
    logger.error(`Brasil NFe: POST ${metodo} falhou`, err.response?.status || err.code || err.message);
    return {
      ok: false,
      mensagem: mensagemErro(err),
      statusCode: err.response?.status,
      code: err.code,
      detalhe: err.response?.data,
      authError: err.response?.status === 401 || err.response?.status === 403,
    };
  }
}

function bufferDeArquivo(data, kind) {
  let raw = data;
  if (raw && typeof raw === "object") {
    raw = raw.Base64File || raw.Base64Xml || raw.base64 || raw.Arquivo || raw.File || "";
  }
  const texto = String(raw || "").replace(/\s/g, "");
  if (!texto) return { ok: false, mensagem: "Brasil NFe não retornou o arquivo." };
  const buffer = Buffer.from(texto, "base64");
  const head = buffer.subarray(0, 5).toString("utf8");
  if (kind === "pdf" && buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
    return { ok: false, mensagem: "Brasil NFe não retornou um DANFE válido." };
  }
  if (kind === "xml" && !head.startsWith("<?xml") && !head.startsWith("<")) {
    return { ok: false, mensagem: "Brasil NFe não retornou um XML válido." };
  }
  return {
    ok: true,
    buffer,
    contentType: kind === "xml" ? "application/xml" : "application/pdf",
  };
}

/** POST /EnviarNotaFiscal — resposta já traz protocolo da SEFAZ. */
export async function emitirNfe(body, creds) {
  const res = await postBrasil("EnviarNotaFiscal", body, creds);
  if (!res.ok) return res;
  const normalizado = normalizarRespostaEmissao(res.data);
  if (normalizado.status === "error" && !normalizado.chaveAcesso && normalizado.errorMessage) {
    return {
      ok: false,
      mensagem: normalizado.cStat
        ? `[${normalizado.cStat}] ${normalizado.xMotivo || normalizado.errorMessage}`
        : normalizado.errorMessage,
      detalhe: normalizado,
    };
  }
  return { ok: true, data: normalizado, statusCode: res.statusCode };
}

/**
 * Status inferido da chave já gravada. Não chama a Brasil NFe.
 * TODO: implementar consulta remota de NF-e quando o client tiver endpoint documentado.
 */
export function statusLocalNfe(idProvedor) {
  const chave = String(idProvedor || "").replace(/\D/g, "");
  if (chave.length !== 44) {
    return { ok: false, mensagem: "Chave da NF-e ausente para leitura local." };
  }
  return {
    ok: true,
    confirmadoExternamente: false,
    fonte: "local",
    data: {
      status: "issued",
      invoiceId: chave,
      chaveAcesso: chave,
    },
  };
}

/** @deprecated Use statusLocalNfe. Não é consulta externa. */
export async function consultarNfe(idProvedor) {
  return statusLocalNfe(idProvedor);
}

/** @deprecated Não sincroniza com a SEFAZ. Mantido para chamadas antigas. */
export async function sincronizarNfeNaSefaz(idProvedor) {
  return statusLocalNfe(idProvedor);
}

async function baixarArquivo(chaveNf, fileType, kind, creds) {
  const chave = String(chaveNf || "").replace(/\D/g, "");
  if (chave.length !== 44) {
    return { ok: false, mensagem: "Chave da NF-e ausente para download na Brasil NFe." };
  }
  const res = await postBrasil(
    "ObterArquivoNotaFiscal",
    {
      ChaveNF: chave,
      FileType: fileType,
      TipoDocumentoFiscal: 1,
    },
    creds,
  );
  if (!res.ok) return res;
  return bufferDeArquivo(res.data, kind);
}

export async function baixarPdfNfe(idProvedor, creds) {
  return baixarArquivo(idProvedor, 2, "pdf", creds);
}

export async function baixarXmlNfe(idProvedor, tipo = "emission", creds) {
  if (tipo === "cancel") {
    const chave = String(idProvedor || "").replace(/\D/g, "");
    const res = await postBrasil(
      "ObterArquivoEvento",
      { ChaveNF: chave, TipoEvento: "110111" },
      creds,
    );
    if (!res.ok) return res;
    return bufferDeArquivo(res.data, "xml");
  }
  return baixarArquivo(idProvedor, 1, "xml", creds);
}

/** POST /CancelarNotaFiscal — justificativa com pelo menos 15 caracteres. */
export async function cancelarNfe(idProvedor, body = {}, creds) {
  const chave = String(idProvedor || body.chave || "").replace(/\D/g, "");
  if (chave.length !== 44) {
    return { ok: false, mensagem: "Chave da NF-e ausente para cancelar na Brasil NFe." };
  }
  const justificativa = String(body.motivo || body.justificativa || "").trim();
  if (justificativa.length < 15) {
    return { ok: false, mensagem: "Justificativa de cancelamento precisa ter pelo menos 15 caracteres." };
  }
  const protocolo = String(body.numeroProtocolo || body.NumeroProtocolo || "").trim();
  if (!protocolo) {
    return { ok: false, mensagem: "Protocolo de autorização da NF-e ausente. Reemita ou sincronize a nota." };
  }
  const res = await postBrasil("CancelarNotaFiscal", {
    ChaveNF: chave,
    Justificativa: justificativa.slice(0, 255),
    NumeroProtocolo: protocolo,
    NumeroSequencial: 1,
  }, creds);
  if (!res.ok) return res;
  const erro = typeof res.data?.Error === "string" ? res.data.Error.trim() : "";
  if (erro) return { ok: false, mensagem: erro, detalhe: res.data };
  return { ok: true, data: { status: "cancelled", invoiceId: chave, chaveAcesso: chave } };
}
