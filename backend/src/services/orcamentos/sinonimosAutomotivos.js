import { normalizarTexto } from "./sugestaoMatcher.js";

/** Grupos curtos e explícitos. Não são gerados automaticamente. */
export const GRUPOS_SINONIMOS = [
  ["liquido arrefecimento", "fluido arrefecimento", "aditivo radiador", "aditivo g13"],
  ["pastilha dianteira", "pastilha freio dianteiro", "pastilha diant"],
  ["oleo motor", "lubrificante motor"],
];

function tokensFrase(frase) {
  return normalizarTexto(frase)
    .split(" ")
    .filter((t) => t.length >= 4);
}

function frasePresente(texto, frase) {
  const tokens = tokensFrase(frase);
  if (!tokens.length) return false;
  return tokens.every((t) => texto.includes(t));
}

/** Acrescenta sinônimos do grupo quando a frase de origem aparece no termo. */
export function expandirSinonimos(termos, limite = 12) {
  const base = [];
  for (const termo of termos || []) {
    const n = normalizarTexto(termo);
    if (n.length >= 2) base.push(n);
  }
  const texto = base.join(" ");
  const extras = [];
  for (const grupo of GRUPOS_SINONIMOS) {
    if (!grupo.some((frase) => frasePresente(texto, frase))) continue;
    extras.push(...grupo);
  }
  return [...new Set([...base, ...extras.map((t) => normalizarTexto(t)).filter((t) => t.length >= 2)])].slice(
    0,
    limite,
  );
}
