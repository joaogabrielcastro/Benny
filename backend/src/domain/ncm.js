/**
 * NCM de catálogo. Vazio é permitido no cadastro.
 * Valor informado precisa ter exatamente 8 dígitos depois de tirar ponto, hífen e espaço.
 */
export function normalizarNcmInformado(valor) {
  if (valor == null) return { vazio: true, ncm: null };
  const texto = String(valor).trim();
  if (!texto) return { vazio: true, ncm: null };
  const digits = texto.replace(/[.\-\s]/g, "");
  if (!/^\d{8}$/.test(digits)) return { vazio: false, ncm: null };
  return { vazio: false, ncm: digits };
}

function itemFiscal(p) {
  return {
    produto_id: p.produto_id ?? null,
    codigo: p.codigo ?? null,
    descricao: p.descricao ?? null,
  };
}

/**
 * Itens da OS que não podem ir na NF-e.
 * Linha sem produto do tenant, ou com NCM ausente/inválido, bloqueia a nota inteira.
 * produto_id de outro tenant não é devolvido.
 */
export function avaliarNcmItensNfe(produtos) {
  const ruins = [];
  for (const p of produtos || []) {
    const outroTenant =
      Object.prototype.hasOwnProperty.call(p, "produto_do_tenant") &&
      p.produto_id != null &&
      p.produto_do_tenant == null;
    if (p.produto_id == null || outroTenant) {
      ruins.push({
        produto_id: null,
        codigo: p.codigo ?? null,
        descricao: p.descricao ?? null,
        motivo: "NFE_PRODUTO_SEM_CADASTRO_FISCAL",
      });
      continue;
    }
    const norm = normalizarNcmInformado(p.ncm || p.produto_ncm);
    if (!norm.ncm) {
      ruins.push({ ...itemFiscal(p), motivo: "NFE_PRODUTO_SEM_NCM" });
    }
  }
  if (!ruins.length) return null;
  const soCadastro = ruins.every(
    (r) => r.motivo === "NFE_PRODUTO_SEM_CADASTRO_FISCAL",
  );
  const code = soCadastro
    ? "NFE_PRODUTO_SEM_CADASTRO_FISCAL"
    : "NFE_PRODUTO_SEM_NCM";
  const message = soCadastro
    ? "Existem peças sem produto de catálogo para informar o NCM."
    : "Existem produtos sem NCM válido.";
  return {
    code,
    message,
    produtos: ruins.map(({ produto_id, codigo, descricao }) => ({
      produto_id,
      codigo,
      descricao,
    })),
  };
}
