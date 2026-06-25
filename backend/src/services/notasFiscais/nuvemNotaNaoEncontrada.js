const MSG_REEMITIR =
  "Nota não encontrada na Nuvem Fiscal. Provável emissão em sandbox/homologação com o servidor em produção (ou o contrário). Clique em Reemitir NFS-e.";

export function mensagemNotaNaoEncontradaAmbiente() {
  return MSG_REEMITIR;
}

/** HTTP 404 NfseNotFound / NfeNotFound — ID do banco não existe no ambiente da API atual. */
export function isNuvemNotaNaoEncontrada(res) {
  if (!res || res.ok) return false;
  if (res.statusCode === 404) return true;
  const detalhe = res.detalhe;
  const code =
    detalhe?.error?.code || detalhe?.code || detalhe?.error?.error?.code;
  if (code === "NfseNotFound" || code === "NfeNotFound") return true;
  const texto = String(res.mensagem || "");
  return /NfseNotFound|NfeNotFound|Nota não encontrada/i.test(texto);
}
