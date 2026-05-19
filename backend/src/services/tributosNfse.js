import { getNuvemFiscalConfig } from "../config/nuvemFiscal.js";

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function parseMoney(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? roundMoney(n) : null;
}

/** Percorre caminhos aninhados no JSON da Nuvem até achar um número. */
function pickMoney(data, paths) {
  if (!data || typeof data !== "object") return null;
  for (const keys of paths) {
    let cur = data;
    for (const key of keys) {
      cur = cur?.[key];
    }
    const n = parseMoney(cur);
    if (n != null) return n;
  }
  return null;
}

/**
 * Extrai tributos do JSON retornado pela Nuvem (emissão ou consulta).
 * Se a API não trouxer ISS/PIS/COFINS, estima com alíquotas do .env.
 */
export function extrairTributosDeRespostaNuvem(data, valorTotalOs = 0) {
  const cfg = getNuvemFiscalConfig();

  const base =
    parseMoney(valorTotalOs) ??
    pickMoney(data, [
      ["valor_servico"],
      ["valor_total"],
      ["valores", "vServPrest", "vServ"],
      ["vServ"],
      ["infDPS", "valores", "vServPrest", "vServ"],
    ]) ??
    0;

  let valorIss = pickMoney(data, [
    ["valores", "iss"],
    ["valores", "vISS"],
    ["valores", "vIss"],
    ["valores", "trib", "tribMun", "vISSQN"],
    ["valores", "trib", "tribMun", "vIss"],
    ["vISSQN"],
    ["iss", "valor"],
    ["ISSQN"],
    ["infDPS", "valores", "trib", "tribMun", "vISSQN"],
  ]);

  if (valorIss == null) {
    const tribMun = pickMoney(data, [
      ["valores", "trib", "totTrib", "vTotTrib", "vTotTribMun"],
    ]);
    if (tribMun != null && tribMun > 0) valorIss = tribMun;
  }

  let valorPis = pickMoney(data, [
    ["valores", "pis"],
    ["valores", "vPIS"],
    ["valores", "vPis"],
    ["valores", "trib", "tribFed", "vPIS"],
    ["vPIS"],
    ["valores", "trib", "totTrib", "vTotTrib", "vTotTribFed"],
  ]);

  let valorCofins = pickMoney(data, [
    ["valores", "cofins"],
    ["valores", "vCOFINS"],
    ["valores", "vCofins"],
    ["valores", "trib", "tribFed", "vCOFINS"],
    ["vCOFINS"],
  ]);

  const aliquotaIssApi = pickMoney(data, [
    ["valores", "trib", "tribMun", "pAliq"],
    ["valores", "pAliq"],
    ["pAliq"],
  ]);

  const aliquotaIss = aliquotaIssApi ?? cfg.aliquotaIss;

  let fonteIss = valorIss != null ? "nuvem" : "nenhum";
  if (valorIss == null && cfg.aliquotaIss > 0 && base > 0) {
    valorIss = roundMoney((base * cfg.aliquotaIss) / 100);
    fonteIss = "estimativa";
  } else if (valorIss == null) {
    valorIss = 0;
  }

  let fontePis = valorPis != null ? "nuvem" : "nenhum";
  if (valorPis == null && cfg.aliquotaPis > 0 && base > 0) {
    valorPis = roundMoney((base * cfg.aliquotaPis) / 100);
    fontePis = "estimativa";
  } else if (valorPis == null) {
    valorPis = 0;
  }

  let fonteCofins = valorCofins != null ? "nuvem" : "nenhum";
  if (valorCofins == null && cfg.aliquotaCofins > 0 && base > 0) {
    valorCofins = roundMoney((base * cfg.aliquotaCofins) / 100);
    fonteCofins = "estimativa";
  } else if (valorCofins == null) {
    valorCofins = 0;
  }

  const valorLiquido = roundMoney(base - valorIss);

  return {
    valor_base: base,
    valor_icms: 0,
    valor_iss: valorIss,
    valor_pis: valorPis,
    valor_cofins: valorCofins,
    valor_liquido: valorLiquido > 0 ? valorLiquido : base,
    aliquota_iss: aliquotaIss,
    aliquota_pis: cfg.aliquotaPis,
    aliquota_cofins: cfg.aliquotaCofins,
    fonte_iss: fonteIss,
    fonte_pis: fontePis,
    fonte_cofins: fonteCofins,
  };
}

/** Estimativa antes da resposta da Nuvem (pré-emissão / config pendente). */
export function tributosEstimadosDaOs(valorTotal) {
  return extrairTributosDeRespostaNuvem(null, valorTotal);
}
