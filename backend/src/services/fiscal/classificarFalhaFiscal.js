/** Classificação interna. O status público da nota não muda por causa dela. */
export const CLASSE_FALHA = {
  TRANSPORT_ERROR: "TRANSPORT_ERROR",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  FISCAL_REJECTION: "FISCAL_REJECTION",
  PROCESSING: "PROCESSING",
  AUTHORIZED: "AUTHORIZED",
};

export function classificarResultadoFiscal(api, statusInterno) {
  if (statusInterno === "autorizada") return CLASSE_FALHA.AUTHORIZED;
  if (statusInterno === "processamento") return CLASSE_FALHA.PROCESSING;
  if (!api || api.ok === false) {
    if (api?.authError) return CLASSE_FALHA.PROVIDER_ERROR;
    const code = api?.code || api?.detalhe?.code;
    const msg = String(api?.mensagem || "");
    if (
      code === "ECONNABORTED" ||
      code === "ECONNRESET" ||
      code === "ENOTFOUND" ||
      code === "ETIMEDOUT" ||
      /timeout|network|socket|ECONN/i.test(msg) ||
      (api?.statusCode && api.statusCode >= 500)
    ) {
      return CLASSE_FALHA.TRANSPORT_ERROR;
    }
    if (!api?.statusCode && /falha|fetch|axios/i.test(msg)) {
      return CLASSE_FALHA.TRANSPORT_ERROR;
    }
    return CLASSE_FALHA.FISCAL_REJECTION;
  }
  if (statusInterno === "rejeitada" || statusInterno === "erro_autenticacao") {
    return statusInterno === "erro_autenticacao"
      ? CLASSE_FALHA.PROVIDER_ERROR
      : CLASSE_FALHA.FISCAL_REJECTION;
  }
  return CLASSE_FALHA.PROCESSING;
}

export function classeDaNota(nf) {
  const dados = nf?.dados_resposta;
  if (dados && typeof dados === "object" && dados.classe_interna) {
    return dados.classe_interna;
  }
  return null;
}
