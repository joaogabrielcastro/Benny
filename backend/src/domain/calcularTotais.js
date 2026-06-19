/**
 * Totais de linhas de produtos/serviços (orçamentos e OS).
 */
export function calcularTotais(produtos = [], servicos = []) {
  const valor_produtos = produtos.reduce(
    (s, i) => s + Number(i.valor_total || 0),
    0,
  );
  const valor_servicos = servicos.reduce(
    (s, i) => s + Number(i.valor_total || 0),
    0,
  );
  return {
    valor_produtos,
    valor_servicos,
    valor_total: valor_produtos + valor_servicos,
  };
}
