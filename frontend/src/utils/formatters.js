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

const FUSO_BRASIL = "America/Sao_Paulo";

export const formatarDataBrasil = (data) => {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "—";
  return valor.toLocaleDateString("pt-BR", { timeZone: FUSO_BRASIL });
};

export const formatarDataHoraBrasil = (data) => {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "—";
  return valor.toLocaleString("pt-BR", { timeZone: FUSO_BRASIL });
};

export const formatarHora = (data) => {
  if (!data) return "";
  const dateObj = new Date(data);
  return dateObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
