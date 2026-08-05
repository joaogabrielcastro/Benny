const MSG_REEMITIR =
  "Nota não encontrada na Notaas. Clique em Reemitir NFS-e para gerar uma nova emissão.";

export function mensagemNotaNaoEncontradaAmbiente() {
  return MSG_REEMITIR;
}

/** HTTP 404 — ID do banco não existe na Notaas. */
export function isNuvemNotaNaoEncontrada(res) {
  if (!res || res.ok) return false;
  if (res.statusCode === 404) return true;
  const detalhe = res.detalhe;
  const code =
    detalhe?.error?.code ||
    detalhe?.code ||
    detalhe?.errorCode ||
    detalhe?.error?.error?.code;
  if (
    code === "NfseNotFound" ||
    code === "NfeNotFound" ||
    code === "NOT_FOUND" ||
    code === "InvoiceNotFound"
  )
    return true;
  const texto = String(res.mensagem || "");
  return /NfseNotFound|NfeNotFound|InvoiceNotFound|Nota não encontrada|not found/i.test(
    texto,
  );
}

/** Nota ainda na fila (queued/processing) — sem sync forçado separado na Notaas. */
export function isNuvemFilaProcessamento(res) {
  if (!res || res.ok) return false;
  const detalhe = res.detalhe;
  const code = detalhe?.error?.code || detalhe?.code || detalhe?.errorCode;
  if (code === "ValidationFailed" || code === "CONFLICT" || code === 409) {
    const msg = String(detalhe?.error?.message || detalhe?.errorMessage || res.mensagem || "");
    if (/fila|processamento|processing|queued|ainda não emitida/i.test(msg))
      return true;
  }
  if (res.statusCode === 409) {
    const texto = String(res.mensagem || "");
    if (/ainda não emitida|processing|queued/i.test(texto)) return true;
  }
  const texto = String(res.mensagem || "");
  return /fila de processamento|ainda em processamento/i.test(texto);
}

export function mensagemNuvemFilaProcessamento() {
  return "NFS-e ainda em processamento na Notaas. Aguarde 1–2 minutos e use Atualizar status, ou Reemitir se continuar rejeitada.";
}
