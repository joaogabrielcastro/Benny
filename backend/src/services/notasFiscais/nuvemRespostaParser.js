import { extrairTributosDeRespostaNuvem } from "../tributosNfse.js";
import { PROVEDOR_FISCAL_LABEL } from "../../config/nuvemFiscal.js";

export function mapStatusApiNuvemParaInterno(apiStatus) {
  if (!apiStatus) return "processamento";

  const s = String(apiStatus).toLowerCase().trim();

  // Notaas
  if (s === "issued") return "autorizada";
  if (s === "queued" || s === "processing") return "processamento";
  if (s === "error") return "rejeitada";
  if (s === "cancelled") return "cancelada";

  if (
    s === "autorizada" ||
    s === "autorizado" ||
    s === "emitida" ||
    s === "concluida" ||
    s === "concluído" ||
    s === "concluido" ||
    s === "sucesso" ||
    s === "aprovada"
  )
    return "autorizada";

  if (s === "processando" || s === "processamento" || s === "pendente")
    return "processamento";

  if (
    s === "negada" ||
    s === "negado" ||
    s === "erro" ||
    s === "rejeitada" ||
    s === "rejeitado" ||
    s === "denegada" ||
    s === "denegado" ||
    s === "falha" ||
    s === "reprovada" ||
    s === "reprovado"
  )
    return "rejeitada";

  if (s === "cancelada") return "cancelada";
  if (s === "substituida" || s === "substituída") return "substituida";

  return "processamento";
}

export function extrairStatusBrutoNuvem(data) {
  if (!data || typeof data !== "object") return null;
  const candidatos = [
    data.status,
    data.situacao,
    data.status_nfse,
    data.situacao_nfse,
    data.status_nfe,
    data.situacao_nfe,
    data.status_sefaz,
    data.autorizacao?.status,
    data.DPS?.status,
    data.nfse?.status,
  ];
  for (const c of candidatos) {
    if (c != null && String(c).trim() !== "") return String(c).trim();
  }
  return null;
}

function nfPareceAutorizada(data) {
  if (!data || typeof data !== "object") return false;
  const num =
    data.numero ??
    data.numeroNfe ??
    data.nNFSe ??
    data.nfse?.numero;
  const chave =
    data.chNFSe ??
    data.chave ??
    data.chave_acesso ??
    data.DPS?.chave ??
    data.nfse?.chave;
  const link =
    data.pdfUrl ?? data.link_url ?? data.url ?? data.link_pdf;
  return Boolean(num && (chave || link));
}

export function resolverStatusNuvem(data) {
  const bruto = extrairStatusBrutoNuvem(data);
  let interno = mapStatusApiNuvemParaInterno(bruto);

  if (bruto && /rejeit|negad|deneg|falha|erro|error/i.test(String(bruto))) {
    interno = "rejeitada";
  }

  if (interno === "processamento" && nfPareceAutorizada(data)) {
    interno = "autorizada";
  }

  const msgs = data?.mensagens || data?.errors;
  if (
    interno === "processamento" &&
    Array.isArray(msgs) &&
    msgs.some((m) => {
      const t = String(m?.tipo || m?.type || m?.Codigo || "").toLowerCase();
      return t.includes("erro") || t.includes("rejei") || t.includes("error");
    })
  ) {
    interno = "rejeitada";
  }

  if (data?.errorMessage || data?.errorCode) {
    if (interno === "processamento" || !bruto) interno = "rejeitada";
  }

  return { interno, bruto };
}

function mensagemPadraoPorStatus(status, msgApi, modelo = "NFSE") {
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";
  const provedor = PROVEDOR_FISCAL_LABEL;
  if (msgApi) return msgApi;
  if (status === "autorizada") return `${label} autorizada na ${provedor}.`;
  if (status === "rejeitada")
    return `${label} rejeitada na ${provedor}. Veja o motivo abaixo.`;
  if (status === "processamento")
    return `${label} ainda em processamento na ${provedor}. Aguarde alguns minutos e use Atualizar status.`;
  if (status === "cancelada") return `${label} cancelada na ${provedor}.`;
  return `Status atualizado na ${provedor}.`;
}

export function resumoMensagensApi(data) {
  if (!data || typeof data !== "object") return null;

  const partes = [];

  if (typeof data.errorMessage === "string" && data.errorMessage.trim()) {
    const cod = data.errorCode ? `[${data.errorCode}] ` : "";
    partes.push(`${cod}${data.errorMessage.trim()}`);
  }

  if (Array.isArray(data.errors) && data.errors.length) {
    partes.push(
      ...data.errors
        .map((x) => {
          const cod = x?.Codigo ?? x?.codigo ?? x?.code;
          const txt =
            x?.Descricao ||
            x?.descricao ||
            x?.Complemento ||
            x?.message ||
            x?.mensagem;
          if (cod != null && txt) return `[${cod}] ${txt}`;
          return txt || (cod != null ? String(cod) : null);
        })
        .filter(Boolean),
    );
  }

  const auth = data.autorizacao;
  if (auth && typeof auth === "object") {
    const cod = auth.codigo_status ?? auth.codigo;
    const motivo = auth.motivo_status || auth.mensagem || auth.motivo;
    if (motivo) {
      partes.push(cod != null ? `[${cod}] ${motivo}` : motivo);
    }
  }

  if (data.codigo_status != null && data.motivo_status) {
    const linha = `[${data.codigo_status}] ${data.motivo_status}`;
    if (!partes.some((p) => p.includes(String(data.motivo_status)))) {
      partes.push(linha);
    }
  }

  if (data.motivo_status && data.codigo_status == null) {
    partes.push(String(data.motivo_status));
  }

  const m = data.mensagens;
  if (Array.isArray(m) && m.length) {
    partes.push(
      ...m
        .map((x) => {
          const cod = x?.codigo ?? x?.code;
          const txt = x?.descricao || x?.correcao || x?.mensagem || x?.message;
          if (cod != null && txt) return `[${cod}] ${txt}`;
          return txt || (cod != null ? String(cod) : null);
        })
        .filter(Boolean),
    );
  }

  if (typeof data.error === "string" && data.error.trim()) {
    partes.push(data.error.trim());
  }
  if (typeof data.message === "string" && data.message.trim()) {
    partes.push(data.message.trim());
  }

  const unicos = [...new Set(partes.map((p) => String(p).trim()).filter(Boolean))];
  return unicos.length ? unicos.join(" · ") : null;
}

/** Motivo legível quando status = rejeitado/error. */
export function extrairDetalheRejeicaoNuvem(data) {
  const msg = resumoMensagensApi(data);
  if (msg) return msg;

  const bruto = extrairStatusBrutoNuvem(data);
  if (bruto && /rejeit|negad|deneg|erro|falha|error/i.test(String(bruto))) {
    return `Status na ${PROVEDOR_FISCAL_LABEL}: ${bruto}`;
  }
  return null;
}

export function camposFromRespostaNuvem(data, valorTotalOs = 0, modelo = "NFSE") {
  const { interno: status, bruto: statusBruto } = resolverStatusNuvem(data);
  const msgApi = resumoMensagensApi(data);
  const detalheRejeicao =
    status === "rejeitada" ? extrairDetalheRejeicaoNuvem(data) : null;
  const hora = new Date().toLocaleString("pt-BR");
  let mensagem = mensagemPadraoPorStatus(status, msgApi || detalheRejeicao, modelo);
  if (statusBruto) {
    mensagem += ` (${PROVEDOR_FISCAL_LABEL}: ${statusBruto} — consulta ${hora})`;
  } else if (status === "processamento") {
    mensagem += ` (consulta ${hora}: sem status final na ${PROVEDOR_FISCAL_LABEL} ainda)`;
  }

  const emittedRaw =
    data?.issuedAt ||
    data?.emittedAt ||
    data?.data_emissao ||
    null;
  let dataEmissao = null;
  if (emittedRaw) {
    const d = new Date(emittedRaw);
    if (!Number.isNaN(d.getTime())) dataEmissao = d;
  }

  const chaveRaw =
    data?.chNFSe ??
    data?.DPS?.chave ??
    data?.chave ??
    data?.chave_acesso ??
    data?.nfse?.chave ??
    null;
  const numeroRaw =
    data?.numero ??
    data?.numeroNfe ??
    data?.nNFSe ??
    data?.nfse?.numero ??
    null;

  const tributos = extrairTributosDeRespostaNuvem(data, valorTotalOs);
  return {
    status,
    statusBruto,
    idProvedor:
      data?.invoiceId != null
        ? String(data.invoiceId)
        : data?.id != null
          ? String(data.id)
          : null,
    numeroNf: numeroRaw != null && numeroRaw !== "" ? String(numeroRaw).slice(0, 80) : null,
    linkPdf:
      data?.pdfUrl ??
      data?.link_url ??
      data?.url ??
      data?.link_pdf ??
      data?.link_danfe ??
      null,
    dataEmissao,
    chaveAcesso: chaveRaw != null && chaveRaw !== "" ? String(chaveRaw) : null,
    mensagem,
    detalheRejeicao,
    dadosResposta: data,
    tributos,
  };
}
