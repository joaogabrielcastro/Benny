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

export const formatarHora = (data) => {
  if (!data) return "";
  const dateObj = new Date(data);
  return dateObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
