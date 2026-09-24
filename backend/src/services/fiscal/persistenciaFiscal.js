/** Mantém o valor anterior quando a resposta nova veio vazia. */
export function preservarCampoFiscal(novo, anterior) {
  if (novo == null) return anterior ?? null;
  if (typeof novo === "string" && novo.trim() === "") return anterior ?? null;
  return novo;
}

/**
 * Colunas de identidade fiscal não podem ser apagadas por um upsert incompleto.
 * Status, mensagem e JSON de diagnóstico continuam atualizáveis pelo caller.
 */
export function camposIdentidadeFiscal(novo, anterior = {}) {
  return {
    idProvedor: preservarCampoFiscal(novo.idProvedor, anterior.id_provedor ?? anterior.idProvedor),
    numero: preservarCampoFiscal(novo.numero, anterior.numero),
    chaveAcesso: preservarCampoFiscal(novo.chaveAcesso, anterior.chave_acesso ?? anterior.chaveAcesso),
    serie: preservarCampoFiscal(novo.serie, anterior.serie),
    protocolo: preservarCampoFiscal(novo.protocolo, anterior.protocolo),
  };
}
