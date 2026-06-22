import axios from "axios";
import logger from "../config/logger.js";

function normalizarPlaca(placa) {
  return String(placa || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function placaFormatoValido(placa) {
  if (!placa || placa.length !== 7) return false;
  const formatoAntigo = /^[A-Z]{3}[0-9]{4}$/;
  const formatoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  return formatoAntigo.test(placa) || formatoMercosul.test(placa);
}

function normalizarChassi(val) {
  const s = String(val || "").trim().toUpperCase();
  if (!s) return "";
  if (s.includes("*")) return s;
  return s.replace(/[^A-Z0-9]/g, "").slice(0, 17);
}

function pick(root, ...keys) {
  if (!root || typeof root !== "object") return "";
  for (const k of keys) {
    const v = root[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function parseAlvoVeiculo(alvo, rootFallback) {
  if (!alvo || typeof alvo !== "object") return null;

  const marcaModeloJunto = pick(
    alvo,
    "marcaModelo",
    "MARCA_MODELO",
    "textoMarcaModelo",
  );
  let marca = pick(alvo, "marca", "MARCA", "Marca", "nome_marca", "nomeMarca");
  let modelo = pick(
    alvo,
    "modelo",
    "MODELO",
    "Modelo",
    "texto_modelo",
    "textoModelo",
    "name",
    "nome_modelo",
    "sub_modelo",
    "SUBMODELO",
    "descricao",
    "MODELO_VEICULO",
  );
  let ano = pick(
    alvo,
    "ano",
    "anoModelo",
    "AnoModelo",
    "ano_modelo",
    "Ano",
    "anoFabricacao",
    "ano_fabricacao",
    "anoModeloFabricacao",
  );
  if (typeof ano === "number") ano = String(Math.floor(ano));
  const cor = pick(alvo, "cor", "COR", "Cor", "cor_veiculo", "nome_cor", "COR_VEICULO");

  if (!marca && !modelo && marcaModeloJunto) {
    const barra = marcaModeloJunto.indexOf("/");
    if (barra > 0) {
      marca = marcaModeloJunto.slice(0, barra).trim();
      modelo = marcaModeloJunto.slice(barra + 1).trim();
    } else {
      modelo = marcaModeloJunto;
    }
  }

  if ((!marca || !modelo) && rootFallback?.fipe?.dados?.[0]) {
    const fipe0 = rootFallback.fipe.dados[0];
    if (!marca) marca = pick(fipe0, "texto_marca", "marca");
    if (!modelo) modelo = pick(fipe0, "texto_modelo", "modelo");
    if (!ano) ano = pick(fipe0, "ano_modelo");
  }

  if (!marca && !modelo) return null;

  let chassi = normalizarChassi(
    pick(alvo, "chassi", "CHASSI", "Chassi", "numero_chassi", "nr_chassi"),
  );
  if (!chassi && rootFallback) {
    chassi = normalizarChassi(
      pick(rootFallback, "chassi", "CHASSI", "Chassi", "numero_chassi"),
    );
  }

  return {
    marca,
    modelo,
    ano: ano ? String(ano).replace(/\D/g, "").slice(0, 4) : "",
    cor,
    chassi,
  };
}

function extrairDadosDePayload(data) {
  const root = Array.isArray(data) ? data[0] : data;
  if (!root || typeof root !== "object") return null;

  const fontes = [
    root,
    root.extra,
    root.dados,
    root.data,
    root.veiculo,
    root.resultado,
  ];
  for (const alvo of fontes) {
    const parsed = parseAlvoVeiculo(alvo, root);
    if (parsed) return parsed;
  }
  return null;
}

/** Mesmo formato histórico da API-Carros (codigoRetorno "0"). */
function extrairEstiloApiCarros(data) {
  const root = data && typeof data === "object" ? data : null;
  if (!root) return null;
  if (String(root.codigoRetorno ?? "") !== "0") return null;
  const texto = String(root.modelo || root.marca || "").trim();
  let marca = "";
  let modelo = "";
  const barra = texto.indexOf("/");
  if (barra > 0) {
    marca = texto.slice(0, barra).trim();
    modelo = texto.slice(barra + 1).trim();
  } else {
    modelo = texto;
    const m = String(root.marca || "").trim();
    const b2 = m.indexOf("/");
    marca = b2 > 0 ? m.slice(0, b2).trim() : m;
  }
  if (!marca && !modelo) return null;
  const anoBruto = root.anoModelo ?? root.ano;
  const ano =
    anoBruto !== undefined && anoBruto !== null
      ? String(anoBruto).replace(/\D/g, "").slice(0, 4)
      : "";
  const cor = String(root.cor || "").trim();
  const chassi = normalizarChassi(pick(root, "chassi", "CHASSI", "Chassi"));
  return { marca, modelo, ano, cor, chassi };
}

export function extrairVeiculoDeJson(data) {
  return extrairDadosDePayload(data) || extrairEstiloApiCarros(data);
}

async function consultarFipeApiComBr(placa, apiKey) {
  const url = `https://placas.fipeapi.com.br/placas/${encodeURIComponent(placa)}?key=${encodeURIComponent(apiKey)}`;
  const { data } = await axios.get(url, { timeout: 25_000 });
  if (data && typeof data === "object" && data.message && !data.marca) {
    return { ok: false, erro: String(data.message) };
  }
  const veiculo = extrairVeiculoDeJson(data);
  if (!veiculo) {
    return { ok: false, erro: "Resposta da API não contém marca/modelo reconhecíveis." };
  }
  return { ok: true, ...veiculo };
}

async function consultarPlacaFipeComBr(placa, token) {
  const url = `https://api.placafipe.com.br/getplacafipe/${encodeURIComponent(placa)}/${encodeURIComponent(token)}`;
  const { data } = await axios.get(url, { timeout: 25_000 });
  const veiculo = extrairVeiculoDeJson(data);
  if (!veiculo) {
    const msg =
      (data && typeof data === "object" && (data.message || data.erro)) ||
      "Resposta inválida do provedor de consulta por placa.";
    return { ok: false, erro: String(msg) };
  }
  return { ok: true, ...veiculo };
}

function montarUrlGratis(placa, template) {
  const enc = encodeURIComponent(placa);
  return String(template).replace(/\{placa\}/gi, enc).replace(/\{PLACA\}/g, enc);
}

async function consultarUrlGratis(placa, template) {
  if (!/\{placa\}|\{PLACA\}/i.test(template)) {
    return {
      ok: false,
      erro: "CONSULTA_PLACA_GRATIS_URL precisa incluir o placeholder {placa} (ex.: https://meu-servidor/placa/{placa}).",
    };
  }
  const url = montarUrlGratis(placa, template);
  const { data } = await axios.get(url, { timeout: 25_000 });
  const veiculo = extrairVeiculoDeJson(data);
  if (!veiculo) {
    return { ok: false, erro: "A URL gratuita não retornou marca/modelo no formato esperado." };
  }
  return { ok: true, ...veiculo };
}

/** URL oficial: https://wdapi2.com.br/consulta/{placa}/{token} */
export function montarUrlWdapi2Consulta(placa, token) {
  return `https://wdapi2.com.br/consulta/${encodeURIComponent(placa)}/${encodeURIComponent(token)}`;
}

function mensagemErroWdapi2(status, data) {
  if (data && typeof data === "object" && data.message) {
    return String(data.message);
  }
  const map = {
    400: "URL da consulta WDAPI2 incorreta.",
    401: "Placa inválida na WDAPI2.",
    402: "Token WDAPI2 inválido. Confira WDAPI2_TOKEN no servidor (Painel do Usuário).",
    406: "WDAPI2: sem resultados para esta placa.",
    429: "Limite diário de consultas WDAPI2 atingido.",
  };
  return map[status] || `WDAPI2 HTTP ${status}`;
}

async function consultarWdapi2(placa, token) {
  const url = montarUrlWdapi2Consulta(placa, token);
  const { data, status } = await axios.get(url, { timeout: 25_000, validateStatus: () => true });
  if (status !== 200) {
    return { ok: false, erro: mensagemErroWdapi2(status, data) };
  }
  const veiculo = extrairVeiculoDeJson(data);
  if (!veiculo) {
    return { ok: false, erro: "WDAPI2 retornou JSON sem marca/modelo reconhecíveis." };
  }
  return { ok: true, ...veiculo };
}

function envWdapi2Token() {
  return (
    process.env.WDAPI2_TOKEN ||
    process.env.CONSULTA_PLACA_WDAPI2_TOKEN ||
    process.env.WDAPI2_API_TOKEN ||
    ""
  );
}

function envGratisUrl() {
  return String(process.env.CONSULTA_PLACA_GRATIS_URL || "").trim();
}

function temAlgumProvedor(placaFipeToken, fipeKey) {
  return !!(envGratisUrl() || envWdapi2Token() || placaFipeToken || fipeKey);
}

/**
 * Consulta marca/modelo/ano/cor pela placa (somente identificação do veículo; sem valor de mercado).
 * Modo gratuito / baixo custo: defina um ou ambos:
 * - CONSULTA_PLACA_GRATIS_URL — GET para URL com {placa}, retorno JSON (marca/modelo/ano/cor ou aninhado em dados).
 * - WDAPI2_TOKEN — token normal em https://wdapi2.com.br (Painel do Usuário; URL /consulta/{placa}/{token})
 * Opcional (provedores comerciais por placa; nomes legados no .env): FIPE_PLACA_API_KEY, PLACAFIPE_TOKEN
 * (ignorados se CONSULTA_PLACA_SOMENTE_GRATIS=1).
 */
export async function consultarVeiculoPorPlaca(placaBruta) {
  const placa = normalizarPlaca(placaBruta);
  if (!placaFormatoValido(placa)) {
    return {
      ok: false,
      erro: "Placa inválida. Use formato antigo (ABC1234) ou Mercosul (ABC1D23).",
    };
  }

  const somenteGratis =
    String(process.env.CONSULTA_PLACA_SOMENTE_GRATIS || "").toLowerCase() === "1" ||
    String(process.env.CONSULTA_PLACA_SOMENTE_GRATIS || "").toLowerCase() === "true";

  const fipeKey = process.env.FIPE_PLACA_API_KEY || process.env.FIPEAPI_PLACA_KEY || "";
  const placaFipeToken =
    process.env.PLACAFIPE_TOKEN || process.env.PLACAFIPE_API_TOKEN || "";

  if (!temAlgumProvedor(placaFipeToken, fipeKey)) {
    return {
      ok: false,
      erro:
        "Nenhum provedor de consulta por placa configurado. Para dados básicos do veículo: defina WDAPI2_TOKEN (wdapi2.com.br) e/ou CONSULTA_PLACA_GRATIS_URL (sua API com {placa}). Opcionalmente use FIPE_PLACA_API_KEY ou PLACAFIPE_TOKEN (serviços pagos que identificam o veículo pela placa).",
    };
  }

  const erros = [];
  const gratisUrl = envGratisUrl();
  const wdToken = envWdapi2Token();

  if (gratisUrl) {
    try {
      const r = await consultarUrlGratis(placa, gratisUrl);
      if (r.ok) return { ok: true, placa, provedor: "CONSULTA_PLACA_GRATIS_URL", ...r };
      erros.push(`url_gratis: ${r.erro}`);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      logger.warn("placaLookup CONSULTA_PLACA_GRATIS_URL falhou", msg);
      erros.push(`url_gratis: ${msg}`);
    }
  }

  if (wdToken) {
    try {
      const r = await consultarWdapi2(placa, wdToken);
      if (r.ok) return { ok: true, placa, provedor: "wdapi2.com.br", ...r };
      erros.push(`wdapi2: ${r.erro}`);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      logger.warn("placaLookup wdapi2 falhou", msg);
      erros.push(`wdapi2: ${msg}`);
    }
  }

  if (somenteGratis) {
    return {
      ok: false,
      erro:
        erros.join(" | ") ||
        "Consulta somente gratuita: ajuste CONSULTA_PLACA_GRATIS_URL ou WDAPI2_TOKEN.",
    };
  }

  if (fipeKey) {
    try {
      const r = await consultarFipeApiComBr(placa, fipeKey);
      if (r.ok) return { ok: true, placa, provedor: "fipeapi.com.br", ...r };
      erros.push(`fipeapi: ${r.erro}`);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      logger.warn("placaLookup fipeapi falhou", msg);
      erros.push(`fipeapi: ${msg}`);
    }
  }

  if (placaFipeToken) {
    try {
      const r = await consultarPlacaFipeComBr(placa, placaFipeToken);
      if (r.ok) return { ok: true, placa, provedor: "placafipe.com.br", ...r };
      erros.push(`placafipe: ${r.erro}`);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      logger.warn("placaLookup placafipe falhou", msg);
      erros.push(`placafipe: ${msg}`);
    }
  }

  return {
    ok: false,
    erro: erros.length ? erros.join(" | ") : "Não foi possível obter dados da placa.",
  };
}
