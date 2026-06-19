const STORAGE_KEY = "benny-impressao-defaults";

export const DEFAULTS_ORCAMENTO = {
  validadeOrcamento:
    "Este orçamento tem validade de 7 dias corridos a partir da data de emissão.",
  garantia:
    "Todos os nossos serviços e produtos possuem 6 meses de garantia.",
  termosAdicionais: "",
};

export const DEFAULTS_OS = {
  garantia:
    "Todos os nossos serviços e produtos possuem 6 meses de garantia.",
  mensagemRodape: "Obrigado pela preferência!",
  termosAdicionais: "",
};

export function carregarDefaultsImpressao(tipo) {
  const padrao = tipo === "orcamento" ? DEFAULTS_ORCAMENTO : DEFAULTS_OS;

  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (!salvo) return { ...padrao };

    const parsed = JSON.parse(salvo);
    return { ...padrao, ...(parsed[tipo] || {}) };
  } catch {
    return { ...padrao };
  }
}

export function salvarDefaultsImpressao(tipo, valores) {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    const parsed = salvo ? JSON.parse(salvo) : {};
    parsed[tipo] = valores;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignora falha de localStorage
  }
}
