import { extrairTributosDeRespostaNuvem } from "../tributosNfse.js";

export function mapStatusApiNuvemParaInterno(apiStatus) {
  if (!apiStatus) return "processamento";

  const s = String(apiStatus).toLowerCase().trim();

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
  const num = data.numero ?? data.nNFSe ?? data.nfse?.numero;
  const chave =
    data.chave ?? data.chave_acesso ?? data.DPS?.chave ?? data.nfse?.chave;
  const link = data.link_url ?? data.url ?? data.link_pdf;
  return Boolean(num && (chave || link));
}

export function resolverStatusNuvem(data) {
  const bruto = extrairStatusBrutoNuvem(data);
  let interno = mapStatusApiNuvemParaInterno(bruto);

  if (bruto && /rejeit|negad|deneg|falha|erro/i.test(String(bruto))) {
    interno = "rejeitada";
  }

  if (interno === "processamento" && nfPareceAutorizada(data)) {
    interno = "autorizada";
  }

  const msgs = data?.mensagens;
  if (
    interno === "processamento" &&
    Array.isArray(msgs) &&
    msgs.some((m) => {
      const t = String(m?.tipo || m?.type || "").toLowerCase();
      return t.includes("erro") || t.includes("rejei");
    })
  ) {
    interno = "rejeitada";
  }

  return { interno, bruto };
}

function mensagemPadraoPorStatus(status, msgApi) {
  if (msgApi) return msgApi;
  if (status === "autorizada") return "NFS-e autorizada na Nuvem Fiscal.";
  if (status === "rejeitada")
    return "NFS-e rejeitada na Nuvem Fiscal. Veja as observações.";
  if (status === "processamento")
    return "NFS-e ainda em processamento na Nuvem Fiscal. Aguarde alguns minutos e use Atualizar status.";
  return "Status atualizado na Nuvem Fiscal.";
}

export function resumoMensagensApi(data) {
  const m = data?.mensagens;
  if (!Array.isArray(m) || !m.length) return null;
  return m
    .map((x) => x?.descricao || x?.correcao || x?.codigo)
    .filter(Boolean)
    .join("; ");
}

export function camposFromRespostaNuvem(data, valorTotalOs = 0) {
  const { interno: status, bruto: statusBruto } = resolverStatusNuvem(data);
  const msgApi = resumoMensagensApi(data);
  const hora = new Date().toLocaleString("pt-BR");
  let mensagem = mensagemPadraoPorStatus(status, msgApi);
  if (statusBruto) {
    mensagem += ` (Nuvem: ${statusBruto} — consulta ${hora})`;
  } else if (status === "processamento") {
    mensagem += ` (consulta ${hora}: sem status final na Nuvem ainda)`;
  }
  const tributos = extrairTributosDeRespostaNuvem(data, valorTotalOs);
  return {
    status,
    statusBruto,
    idProvedor: data?.id || null,
    numeroNf: data?.numero ?? data?.nNFSe ?? data?.nfse?.numero ?? null,
    linkPdf:
      data?.link_url ??
      data?.url ??
      data?.link_pdf ??
      data?.link_danfe ??
      null,
    dataEmissao: data?.data_emissao ? new Date(data.data_emissao) : null,
    chaveAcesso:
      data?.DPS?.chave ??
      data?.chave ??
      data?.chave_acesso ??
      data?.nfse?.chave ??
      null,
    mensagem,
    dadosResposta: data,
    tributos,
  };
}
