/**
 * Posições de NCM usadas em autopeças.
 * A descrição é o texto da posição. A escolha continua manual.
 */
export const NCM_AUTOMOTIVO = [
  { ncm: "87083090", descricao: "Freios, servo-freios e suas partes", termos: "pastilha lona disco freio" },
  { ncm: "84212300", descricao: "Filtros de óleo ou de combustível para motores", termos: "filtro oleo combustivel" },
  { ncm: "84213100", descricao: "Filtros de entrada de ar para motores", termos: "filtro ar" },
  { ncm: "27101932", descricao: "Óleos lubrificantes com aditivos", termos: "oleo lubrificante motor cambio" },
  { ncm: "40111000", descricao: "Pneus novos para automóveis de passageiros", termos: "pneu" },
  { ncm: "85111000", descricao: "Velas de ignição", termos: "vela ignicao" },
  { ncm: "87088000", descricao: "Sistemas de suspensão e suas partes", termos: "amortecedor suspensao mola" },
  { ncm: "87089100", descricao: "Radiadores", termos: "radiador arrefecimento" },
  { ncm: "87089200", descricao: "Silenciosos e tubos de escape", termos: "escapamento silencioso" },
  { ncm: "87089300", descricao: "Embreagens e suas partes", termos: "embreagem disco platô" },
  { ncm: "87089490", descricao: "Volantes, colunas e caixas de direção", termos: "direcao caixa volante" },
  { ncm: "85071010", descricao: "Acumuladores de chumbo para arranque de motores", termos: "bateria" },
  { ncm: "85114000", descricao: "Motores de arranque", termos: "motor partida arranque" },
  { ncm: "85115010", descricao: "Dínamos e alternadores", termos: "alternador" },
  { ncm: "40103100", descricao: "Correias de transmissão", termos: "correia dentada poly v" },
  { ncm: "84821010", descricao: "Rolamentos de esferas", termos: "rolamento" },
  { ncm: "84133090", descricao: "Bombas para motores", termos: "bomba agua oleo combustivel" },
  { ncm: "84099190", descricao: "Partes de motores de pistão", termos: "motor junta cabecote pistao" },
  { ncm: "87081000", descricao: "Para-choques e suas partes", termos: "parachoque" },
  { ncm: "87082999", descricao: "Outras partes e acessórios de carroçarias", termos: "carroceria retrovisor grade" },
  { ncm: "87089990", descricao: "Outras partes e acessórios de veículos", termos: "acessorio peca" },
];

function semAcento(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buscarNcmAutomotivo(texto) {
  const q = semAcento(texto).trim();
  if (q.length < 2) return [];
  const digitos = q.replace(/\D/g, "");
  return NCM_AUTOMOTIVO.filter((item) => {
    const alvo = semAcento(`${item.ncm} ${item.descricao} ${item.termos}`);
    return alvo.includes(q) || (digitos.length >= 2 && item.ncm.startsWith(digitos));
  }).slice(0, 8);
}

export function rotuloNcm(ncm) {
  const digitos = String(ncm || "").replace(/\D/g, "");
  return NCM_AUTOMOTIVO.find((item) => item.ncm === digitos) || null;
}
