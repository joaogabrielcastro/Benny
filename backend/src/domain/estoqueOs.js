/**
 * Regras de baixa de estoque em OS.
 *
 * Reserva ocorre na criação (motivo "Utilizado na OS") ou na aprovação do
 * orçamento (motivo "Orçamento aprovado"). Itens com baixa_estoque=true
 * já tiveram essa reserva e NÃO devem ser debitados de novo na finalização.
 */

export function produtoPendenteBaixaFinalizacao(produto) {
  if (!produto?.produto_id) return false;
  return produto.baixa_estoque !== true && produto.baixa_estoque !== "t";
}

/**
 * Indica se a finalização ainda precisa gerar movimentação de baixa.
 * Se qualquer item já está marcado como baixado, a OS já reservou estoque.
 */
export function osJaReservouEstoque(produtos = []) {
  return produtos.some(
    (p) => p?.produto_id && (p.baixa_estoque === true || p.baixa_estoque === "t"),
  );
}

/**
 * Diferença de quantidade por produto de catálogo entre os itens atuais da OS
 * e os itens editados. delta > 0 → precisa baixar do estoque; delta < 0 → devolver.
 * Linhas sem produto_id (peça avulsa) não movimentam estoque.
 * @returns {Array<{produto_id:number, delta:number}>}
 */
export function calcularDeltasEstoque(itensAtuais = [], itensNovos = []) {
  const soma = (lista) => {
    const m = new Map();
    for (const it of lista) {
      const pid = Number(it?.produto_id);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      m.set(pid, (m.get(pid) || 0) + Number(it.quantidade || 0));
    }
    return m;
  };
  const antes = soma(itensAtuais);
  const depois = soma(itensNovos);
  const ids = new Set([...antes.keys(), ...depois.keys()]);
  const out = [];
  for (const id of ids) {
    const delta = (depois.get(id) || 0) - (antes.get(id) || 0);
    if (delta !== 0) out.push({ produto_id: id, delta });
  }
  return out.sort((a, b) => a.produto_id - b.produto_id);
}
