import { isNfseIncluirPecas } from "../config/nuvemFiscal.js";

/** Totais da OS para emissão fiscal (serviços × peças). */
export function totaisFiscaisOs(os) {
  const servicos = os?.servicos || [];
  const produtos = os?.produtos || [];

  const somaServicos = servicos.reduce(
    (s, i) => s + (Number(i.valor_total) || 0),
    0,
  );
  const somaProdutos = produtos.reduce(
    (s, i) => s + (Number(i.valor_total) || 0),
    0,
  );

  const valor_servicos = Math.max(
    0,
    Number(os?.valor_servicos) || somaServicos,
  );
  const valor_produtos = Math.max(
    0,
    Number(os?.valor_produtos) || somaProdutos,
  );

  return {
    valor_servicos: Math.round(valor_servicos * 100) / 100,
    valor_produtos: Math.round(valor_produtos * 100) / 100,
    valor_total:
      Math.round((valor_servicos + valor_produtos) * 100) / 100,
  };
}

/** Valor da NFS-e: total da OS (peças + serviços) ou só serviços, conforme config. */
export function valorEmissaoNfse(totais, incluirPecas = isNfseIncluirPecas()) {
  if (incluirPecas) return totais.valor_total;
  return totais.valor_servicos;
}
