/**
 * Referência estável da mesma emissão lógica.
 * Não usa relógio nem aleatório: retry de rede reutiliza o valor gravado.
 * Uma referência nova só nasce na primeira emissão ou numa reemissão
 * explícita depois de rejeição fiscal (sufixo -rN).
 * Limite 50: a Notaas recusa referência maior.
 */
export function referenciaFiscalEstavel({
  tenantId,
  osId,
  modelo,
  anterior = null,
  renovar = false,
}) {
  const tag = String(modelo || "NFSE").toUpperCase() === "NFE" ? "nfe" : "nfse";
  const base = `b-${tenantId}-os${osId}-${tag}`.slice(0, 44);
  if (!anterior) return base;
  const atual = String(anterior).slice(0, 50);
  if (!renovar) return atual;
  const m = atual.match(/-r(\d+)$/);
  const n = m ? Number(m[1]) + 1 : 2;
  return `${base}-r${n}`.slice(0, 50);
}

/** Nota autorizada não pode ser reenviada ao provider. */
export function emissaoJaAutorizada(nf, { reemitirIncompleta = false } = {}) {
  if (!nf) return false;
  if (nf.status !== "autorizada") return false;
  return !reemitirIncompleta;
}
