import { rotuloVeiculo } from "../veiculos/rotuloVeiculo";

export const OS_STATUS = ["Aberta", "Em andamento", "Finalizada", "Cancelada"];

/** Situação de pagamento a partir de valor_total e valor_recebido. */
export function situacaoPagamentoOs(os) {
  const total = Number(os?.valor_total || 0);
  const recebido = Number(os?.valor_recebido || 0);
  if (total <= 0) return null;
  if (recebido >= total - 0.009) return "Quitada";
  if (recebido > 0.009) return "Parcial";
  return "Em aberto";
}

export function veiculoDaOs(os) {
  return {
    marca: os?.veiculo_marca,
    modelo: os?.veiculo_modelo,
    versao: os?.veiculo_versao,
    motor: os?.veiculo_motor,
    ano: os?.veiculo_ano,
    placa: os?.veiculo_placa,
  };
}

export function rotuloVeiculoSemPlaca(os) {
  return [os?.veiculo_marca, os?.veiculo_modelo, os?.veiculo_versao]
    .filter(Boolean)
    .join(" ") || os?.veiculo_modelo || "—";
}

export { rotuloVeiculo };

/** "há 3 dias", "hoje", "ontem". */
export function tempoRelativo(data) {
  if (!data) return "";
  const d = new Date(data);
  const hoje = new Date();
  const dias = Math.floor(
    (new Date(hoje.toDateString()) - new Date(d.toDateString())) / 86_400_000,
  );
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

export function formatarPlaca(placa) {
  const p = String(placa || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (p.length === 7 && /^[A-Z]{3}\d{4}$/.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return p || "—";
}
