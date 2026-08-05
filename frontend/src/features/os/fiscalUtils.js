export function rotuloFonteTributo(fonte) {
  if (fonte === "nuvem") return " · Notaas";
  if (fonte === "estimativa") return " · estimativa";
  return "";
}

export function formatarAliquota(p) {
  if (p == null || p === "") return "";
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/** Erro da Nuvem relacionado a CEP/município do tomador. */
export function nfErroEnderecoTomador(nota) {
  const msg = String(nota?.observacoes || "").toLowerCase();
  return (
    msg.includes("cep") ||
    msg.includes("município") ||
    msg.includes("municipio") ||
    msg.includes("tomador") ||
    msg.includes("endereço") ||
    msg.includes("endereco")
  );
}

function normalizarMsgFiscal(s) {
  return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Texto único do motivo de rejeição (prioriza detalhe da SEFAZ/Nuvem). */
export function mensagemRejeicaoNota(nota) {
  const detalhe = String(nota?.detalhe_rejeicao || "").trim();
  const obs = String(nota?.observacoes || "").trim();
  return detalhe || obs;
}

/** Observações só quando não repetem o motivo de rejeição. */
export function mostrarObservacoesNota(nota) {
  const obs = String(nota?.observacoes || "").trim();
  if (!obs) return false;
  if (nota?.status_nf !== "rejeitada") return true;
  const motivo = mensagemRejeicaoNota(nota);
  if (!motivo) return true;
  const a = normalizarMsgFiscal(motivo);
  const b = normalizarMsgFiscal(obs);
  if (b.startsWith(a) || b.includes(a)) return false;
  return a !== b;
}

/** Dica operacional para códigos comuns de rejeição NFS-e. */
export function dicaRejeicaoNfse(nota) {
  const msg = mensagemRejeicaoNota(nota).toLowerCase();
  if (msg.includes("e2404")) {
    return "No painel Notaas, confira numeração/série da NFS-e e o próximo número. Aguarde 1–2 min entre tentativas antes de Reemitir.";
  }
  if (msg.includes("e0120")) {
    return "No painel Notaas → empresa Bennys: confira Inscrição Municipal (ou deixe em branco se o município não exigir). Salve e tente Reemitir.";
  }
  return null;
}

/** NFS-e autorizada com valor menor que o total da OS (ex.: sandbox só serviços). */
export function nfseValorIncompleto(os, nota, nfseIncluirPecas) {
  if (!nfseIncluirPecas || !nota || nota.status_nf !== "autorizada") return false;
  const esperado = Number(os?.valor_total) || 0;
  const emitido = Number(nota?.valor_total ?? nota?.valor_liquido) || 0;
  return esperado > 0 && emitido + 0.009 < esperado;
}

export function feedbackNotaFiscal(toast, message, nf) {
  const st = nf?.status_nf;
  if (st === "autorizada") {
    toast.success(message || "Nota fiscal autorizada na Notaas.");
  } else if (st === "configuracao_pendente") {
    toast.error(
      message ||
        "Notaas não configurada neste servidor. Defina NOTAAS_API_KEY no ambiente de produção.",
      { duration: 8000 },
    );
  } else if (st === "erro_autenticacao" || st === "rejeitada") {
    toast.error(message || "Falha na nota fiscal na Notaas.");
  } else if (st === "processamento") {
    toast(message || "Nota em processamento. Aguarde ou atualize o status.", {
      icon: "⏳",
      duration: 6000,
    });
  } else {
    toast(message || "Registro de NF atualizado.", { duration: 5000 });
  }
}
