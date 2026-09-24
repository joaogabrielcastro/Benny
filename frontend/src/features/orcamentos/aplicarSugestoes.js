function linhaProduto(produto, quantidade) {
  const qtd = Number(quantidade) > 0 ? Number(quantidade) : 1;
  const valor = Number(produto.valor_unitario) || 0;
  return {
    produto_id: produto.id,
    codigo: produto.codigo || "",
    descricao: produto.nome || "",
    quantidade: qtd,
    valor_unitario: valor,
    valor_total: Math.round(qtd * valor * 100) / 100,
  };
}

function linhaServico(servico, quantidade) {
  const qtd = Number(quantidade) > 0 ? Number(quantidade) : 1;
  const valor = Number(servico.valor_unitario) || 0;
  return {
    codigo: servico.codigo || "",
    descricao: servico.nome || servico.descricao || "",
    quantidade: qtd,
    valor_unitario: valor,
    valor_total: Math.round(qtd * valor * 100) / 100,
  };
}

/**
 * Copia só itens confirmados pelo usuário para as listas do orçamento.
 * Duplicata de produto (mesmo produto_id) ou de serviço (mesmo código) não cria outra linha.
 */
export function aplicarSugestoesNoOrcamento({
  itensProdutos = [],
  itensServicos = [],
  selecionados = [],
}) {
  const produtos = [...itensProdutos];
  const servicos = [...itensServicos];
  const avisos = [];

  for (const item of selecionados) {
    if (item.tipo === "produto" && item.produto?.id) {
      const idx = produtos.findIndex(
        (p) => String(p.produto_id) === String(item.produto.id),
      );
      if (idx >= 0) {
        avisos.push(`${item.produto.nome || "Produto"} já está no orçamento.`);
        continue;
      }
      produtos.push(linhaProduto(item.produto, item.quantidade_sugerida));
      continue;
    }

    if (item.tipo === "servico" && item.servico) {
      const codigo = String(item.servico.codigo || "").trim();
      if (codigo) {
        const idx = servicos.findIndex((s) => String(s.codigo || "").trim() === codigo);
        if (idx >= 0) {
          avisos.push(`${item.servico.nome || codigo} já está no orçamento.`);
          continue;
        }
      }
      servicos.push(linhaServico(item.servico, item.quantidade_sugerida));
    }
  }

  return { itensProdutos: produtos, itensServicos: servicos, avisos };
}
