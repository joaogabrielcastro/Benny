export const queryKeys = {
  clientes: (params) => ["clientes", params],
  ordensServico: (params) => ["ordens-servico", params],
  orcamentos: (params) => ["orcamentos", params],
  produtos: (params) => ["produtos", params],
  servicos: (params) => ["servicos", params],
  dashboard: ["relatorios", "dashboard"],
  fechamentoMensal: (ano, mes) => ["relatorios", "fechamento-mensal", ano, mes],
  estoqueBaixo: ["produtos", "estoque-baixo"],
  ordemServico: (id) => ["ordens-servico", id],
};
