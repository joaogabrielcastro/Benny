export function rotuloVeiculo(v = {}) {
  const nome = [v.marca, v.modelo, v.versao, v.motor, v.ano]
    .map((parte) => String(parte || "").trim())
    .filter(Boolean)
    .join(" ");
  const placa = String(v.placa || "").trim();
  if (nome && placa) return `${nome} - ${placa}`;
  return nome || placa || "Veículo";
}

export const COMBUSTIVEIS = [
  "Gasolina",
  "Etanol",
  "Flex",
  "Diesel",
  "Elétrico",
  "Híbrido",
  "GNV",
  "Outro",
];
