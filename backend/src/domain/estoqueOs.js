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
