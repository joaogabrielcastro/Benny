export const formatarMoeda = (valor) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
};

export const formatarData = (data) => {
  return new Date(data).toLocaleDateString("pt-BR");
};

export const formatarDataHora = (data) => {
  return new Date(data).toLocaleString("pt-BR");
};
