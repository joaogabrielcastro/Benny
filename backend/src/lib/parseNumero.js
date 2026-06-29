/**
 * Converte strings numéricas em pt-BR (ex.: "1.234,56", "100.000") para number.
 */
export function parseNumeroBR(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const s = String(value).trim().replace(/\s/g, "");
  if (!s) return null;

  if (/^\d+$/.test(s)) return Number(s);

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  if (hasComma) {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  if (hasDot) {
    const parts = s.split(".");
    const pareceMilhar =
      parts.length > 1 &&
      parts.every((p) => /^\d+$/.test(p)) &&
      parts.slice(1).every((p) => p.length === 3);
    const n = Number(pareceMilhar ? parts.join("") : s);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Inteiro para km, quantidade de peças, etc. */
export function parseInteiroBR(value) {
  const n = parseNumeroBR(value);
  if (n == null) return null;
  return Math.round(n);
}
