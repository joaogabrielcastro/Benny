import { SINGLE_TENANT_MODE } from "../config/singleTenant.js";

/**
 * CRT do leiaute da NF-e (C21) e da Brasil NFe (regimes tributários).
 * 1 Simples Nacional — CSOSN
 * 2 Simples Nacional, excesso de sublimite — CST (NT N12a-10: CSOSN só no CRT 1 ou 4)
 * 3 Regime Normal — CST
 * 4 MEI — CSOSN, com a lista da NT 2024.001 regra N12a-80
 * O POST /EnviarNotaFiscal não recebe CRT. O painel da Brasil NFe monta o grupo XML.
 */
export const REGIMES_FISCAIS = {
  SIMPLES_NACIONAL: {
    crt: 1,
    rotulo: "Simples Nacional",
    familia: "CSOSN",
  },
  SIMPLES_NACIONAL_EXCESSO: {
    crt: 2,
    rotulo: "Simples Nacional, excesso de sublimite de receita bruta",
    familia: "CST",
  },
  REGIME_NORMAL: {
    crt: 3,
    rotulo: "Regime Normal",
    familia: "CST",
  },
  MEI: {
    crt: 4,
    rotulo: "Simples Nacional - Microempreendedor Individual - MEI",
    familia: "CSOSN",
  },
};

/** Rótulos da tabela publicada pela Brasil NFe. exigeComplemento = grupo com base, alíquota, crédito ou ST. */
export const CODIGOS_CSOSN = {
  101: { rotulo: "Tributada pelo Simples Nacional com permissão de crédito", exigeComplemento: true },
  102: { rotulo: "Tributada pelo Simples Nacional sem permissão de crédito", exigeComplemento: false },
  103: { rotulo: "Isenção do ICMS pelo Simples Nacional", exigeComplemento: false },
  201: { rotulo: "Tributada com permissão de crédito e com cobrança de ICMS-ST", exigeComplemento: true },
  202: { rotulo: "Tributada sem permissão de crédito e com cobrança de ICMS-ST", exigeComplemento: true },
  203: { rotulo: "Isenção com cobrança de ICMS-ST", exigeComplemento: true },
  300: { rotulo: "Imune", exigeComplemento: false },
  400: { rotulo: "Não tributada", exigeComplemento: false },
  500: { rotulo: "ICMS cobrado anteriormente por substituição ou antecipação", exigeComplemento: true },
  900: { rotulo: "Outras situações", exigeComplemento: false },
};

export const CODIGOS_CST = {
  "00": { rotulo: "Tributada integralmente", exigeComplemento: true },
  10: { rotulo: "Tributada com ICMS-ST", exigeComplemento: true },
  20: { rotulo: "Redução de base de cálculo", exigeComplemento: true },
  30: { rotulo: "Isenta ou não tributada com ICMS-ST", exigeComplemento: true },
  40: { rotulo: "Isenta", exigeComplemento: false },
  41: { rotulo: "Não tributada", exigeComplemento: false },
  50: { rotulo: "Suspensão", exigeComplemento: false },
  51: { rotulo: "Diferimento", exigeComplemento: true },
  60: { rotulo: "ICMS cobrado anteriormente por ST", exigeComplemento: true },
  70: { rotulo: "Redução de BC com ICMS-ST", exigeComplemento: true },
  90: { rotulo: "Outras", exigeComplemento: true },
};

/** NT 2024.001 N12a-80: NF-e modelo 55, CRT 4, idDest diferente de 3. */
export const CSOSN_MEI_NFE_55 = ["102", "300", "400", "900"];

/** NT 2024.001 N12a-90. 300 e 400 não têm lista nessa regra. */
export const CFOP_MEI_CSOSN_102 = ["5102", "6102"];
export const CFOP_MEI_CSOSN_900 = [
  "1202", "1904", "2202", "2904", "5202", "5904", "6202", "6904",
  "1501", "1503", "1504", "1505", "1506", "1553",
  "2501", "2503", "2504", "2505", "2506", "2553",
  "5501", "5502", "5504", "5505", "5551", "5933",
  "6501", "6502", "6504", "6505", "6551", "6933",
];

const UFS = new Set("AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" "));

const POR_CRT = Object.fromEntries(
  Object.entries(REGIMES_FISCAIS).map(([regime, item]) => [item.crt, regime]),
);

function incompleta(campos) {
  return {
    ok: false,
    code: "NFE_CONFIGURACAO_FISCAL_INCOMPLETA",
    message: "A configuração fiscal da empresa está incompleta.",
    campos,
  };
}

export function codigosDaFamilia(regimeTributario) {
  const regime = REGIMES_FISCAIS[regimeTributario];
  if (!regime) return [];
  const tabela = regime.familia === "CSOSN" ? CODIGOS_CSOSN : CODIGOS_CST;
  return Object.entries(tabela)
    .filter(([codigo]) => regime.crt !== 4 || CSOSN_MEI_NFE_55.includes(codigo))
    .filter(([, item]) => !item.exigeComplemento)
    .map(([codigo, item]) => ({
      codigo,
      rotulo: item.rotulo,
      tipo: regime.familia,
    }));
}

export function avaliarCodigoIcms(regimeTributario, codigo) {
  const regime = REGIMES_FISCAIS[regimeTributario];
  if (!regime) return { ok: false, motivo: "Regime tributário não informado." };
  const bruto = String(codigo ?? "").replace(/\D/g, "");
  const normalizado = regime.familia === "CST" ? bruto.padStart(2, "0").slice(-2) : bruto;
  const tabela = regime.familia === "CSOSN" ? CODIGOS_CSOSN : CODIGOS_CST;
  const item = tabela[normalizado];
  if (!item) {
    return {
      ok: false,
      motivo: `Código incompatível com ${regime.familia} deste regime.`,
    };
  }
  if (regime.crt === 4 && !CSOSN_MEI_NFE_55.includes(normalizado)) {
    return {
      ok: false,
      motivo: "CSOSN não permitido para MEI na NF-e modelo 55 (NT 2024.001, regra N12a-80).",
    };
  }
  if (item.exigeComplemento) {
    return {
      ok: false,
      motivo: "Este código exige base, alíquota, crédito ou ST, que ainda não são configurados.",
    };
  }
  return { ok: true, tipo: regime.familia, codigo: normalizado, rotulo: item.rotulo };
}

function crtExplicitoNoEnv() {
  const bruto =
    process.env.NOTAAS_NFE_CRT ??
    process.env.ACBR_API_NFE_CRT ??
    process.env.NUVEM_FISCAL_NFE_CRT;
  if (bruto == null || String(bruto).trim() === "") return null;
  const crt = Number(String(bruto).replace(/\D/g, ""));
  const regime = POR_CRT[crt];
  if (!regime) return null;
  return regime;
}

function codigoExplicitoNoEnv() {
  const bruto =
    process.env.NOTAAS_NFE_CSOSN ??
    process.env.ACBR_API_NFE_CSOSN ??
    process.env.NUVEM_FISCAL_NFE_CSOSN ??
    process.env.NOTAAS_NFE_CST ??
    process.env.ACBR_API_NFE_CST ??
    process.env.NUVEM_FISCAL_NFE_CST;
  if (bruto == null || String(bruto).trim() === "") return null;
  return String(bruto).replace(/\D/g, "");
}

export function configFiscalDe(configuracoes, { singleTenant = SINGLE_TENANT_MODE } = {}) {
  const regimeInformado = configuracoes?.fiscal?.regime_tributario;
  const regime = REGIMES_FISCAIS[regimeInformado]
    ? regimeInformado
    : singleTenant
      ? crtExplicitoNoEnv()
      : null;
  if (!regime) return null;
  const conhecido = REGIMES_FISCAIS[regime];
  const origemRegime = REGIMES_FISCAIS[regimeInformado] ? "tenant" : "env_legado";
  const icmsSalvo = configuracoes?.fiscal?.icms;
  const codigoSalvo = icmsSalvo?.codigo_padrao;
  const avaliacaoSalva =
    origemRegime === "tenant" ? avaliarCodigoIcms(regime, codigoSalvo) : { ok: false };
  let icms = null;
  let origemIcms = null;
  if (avaliacaoSalva.ok && icmsSalvo?.tipo === avaliacaoSalva.tipo) {
    icms = { tipo: avaliacaoSalva.tipo, codigo: avaliacaoSalva.codigo, rotulo: avaliacaoSalva.rotulo };
    origemIcms = "tenant";
  } else if (singleTenant && origemRegime === "env_legado") {
    const avaliado = avaliarCodigoIcms(regime, codigoExplicitoNoEnv());
    if (avaliado.ok) {
      icms = { tipo: avaliado.tipo, codigo: avaliado.codigo, rotulo: avaliado.rotulo };
      origemIcms = "env_legado";
    }
  }
  return {
    regimeTributario: regime,
    crt: conhecido.crt,
    rotulo: conhecido.rotulo,
    familia: conhecido.familia,
    icms,
    ufEmitente: ufEmitenteDe(configuracoes),
    cfop: cfopDe(configuracoes, { singleTenant, origemRegime }),
    origem: origemRegime,
    origemIcms,
  };
}

function cfopQuatro(valor) {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  return digitos.length === 4 ? digitos : null;
}

function ufEmitenteDe(configuracoes) {
  const uf = String(configuracoes?.fiscal?.uf || "").trim().toUpperCase();
  return UFS.has(uf) ? uf : null;
}

function cfopDe(configuracoes, { singleTenant, origemRegime }) {
  const salvo = configuracoes?.fiscal?.cfop;
  const interna = cfopQuatro(salvo?.venda_interna);
  const interestadual = cfopQuatro(salvo?.venda_interestadual);
  if (interna && interestadual) {
    return { vendaInterna: interna, vendaInterestadual: interestadual, origem: "tenant" };
  }
  if (singleTenant && origemRegime === "env_legado") {
    const env = cfopQuatro(
      process.env.NOTAAS_NFE_CFOP ??
        process.env.ACBR_API_NFE_CFOP ??
        process.env.NUVEM_FISCAL_NFE_CFOP,
    );
    if (env) return { vendaInterna: env, vendaInterestadual: env, origem: "env_legado" };
  }
  return null;
}

export function validarCfopMei(crt, csosn, cfop) {
  if (Number(crt) !== 4) return { ok: true };
  if (csosn === "102" && !CFOP_MEI_CSOSN_102.includes(cfop)) {
    return { ok: false, motivo: "CFOP incompatível com MEI e CSOSN 102 (NT 2024.001, regra N12a-90)." };
  }
  if (csosn === "900" && !CFOP_MEI_CSOSN_900.includes(cfop)) {
    return { ok: false, motivo: "CFOP incompatível com MEI e CSOSN 900 (NT 2024.001, regra N12a-90)." };
  }
  return { ok: true };
}

export function resolverCfopOperacao(config, ufDestinatario) {
  const dest = String(ufDestinatario || "").trim().toUpperCase();
  if (dest === "EX" || (dest && !UFS.has(dest))) {
    return {
      ok: false,
      code: "NFE_CONFIGURACAO_FISCAL_INCOMPATIVEL",
      message: "A configuração fiscal da operação é incompatível.",
      campos: [{ campo: "cfop", motivo: "Operação com o exterior não é suportada nesta fase." }],
    };
  }
  if (!config?.ufEmitente || !config?.cfop) {
    return incompleta([{ campo: "cfop", motivo: "UF da oficina ou CFOP da venda não informado." }]);
  }
  const interna = config.ufEmitente === dest;
  const cfop = interna ? config.cfop.vendaInterna : config.cfop.vendaInterestadual;
  const mei = validarCfopMei(config.crt, config.icms?.codigo, cfop);
  if (!mei.ok) {
    return {
      ok: false,
      code: "NFE_CONFIGURACAO_FISCAL_INCOMPATIVEL",
      message: "A configuração fiscal da operação é incompatível.",
      campos: [{ campo: "cfop", motivo: mei.motivo }],
    };
  }
  return { ok: true, cfop, destino: interna ? "interna" : "interestadual" };
}

export function validarConfigFiscal(configuracoes, opcoes) {
  const config = configFiscalDe(configuracoes, opcoes);
  if (!config) {
    return incompleta([
      { campo: "regime_tributario", motivo: "Regime tributário não informado." },
    ]);
  }
  const icmsSalvo = configuracoes?.fiscal?.icms;
  if (icmsSalvo?.codigo_padrao && icmsSalvo.tipo && icmsSalvo.tipo !== config.familia) {
    return incompleta([
      {
        campo: "icms",
        motivo: `Regime ${config.rotulo} exige ${config.familia}, não ${icmsSalvo.tipo}.`,
      },
    ]);
  }
  if (!config.icms) {
    const avaliacao = avaliarCodigoIcms(config.regimeTributario, icmsSalvo?.codigo_padrao);
    return incompleta([
      {
        campo: "icms",
        motivo: icmsSalvo?.codigo_padrao
          ? avaliacao.motivo
          : "Situação tributária padrão não informada.",
      },
    ]);
  }
  return { ok: true, config };
}

export function mesclarRegimeFiscal(configuracoes, regimeTributario, codigoIcms, operacao = null) {
  const avaliacao = avaliarCodigoIcms(regimeTributario, codigoIcms);
  if (!avaliacao.ok) {
    const erro = new Error(avaliacao.motivo);
    erro.code = "NFE_CONFIGURACAO_FISCAL_INCOMPLETA";
    throw erro;
  }
  const base =
    configuracoes && typeof configuracoes === "object" ? { ...configuracoes } : {};
  const fiscal = { ...(base.fiscal && typeof base.fiscal === "object" ? base.fiscal : {}) };
  fiscal.regime_tributario = regimeTributario;
  fiscal.crt = REGIMES_FISCAIS[regimeTributario].crt;
  fiscal.icms = { tipo: avaliacao.tipo, codigo_padrao: avaliacao.codigo };
  if (operacao) {
    const uf = String(operacao.uf || "").trim().toUpperCase();
    const interna = cfopQuatro(operacao.vendaInterna);
    const interestadual = cfopQuatro(operacao.vendaInterestadual);
    if (!UFS.has(uf) || !interna || !interestadual) {
      const erro = new Error("UF da oficina ou CFOP da venda não informado.");
      erro.code = "NFE_CONFIGURACAO_FISCAL_INCOMPLETA";
      throw erro;
    }
    for (const cfop of [interna, interestadual]) {
      const mei = validarCfopMei(REGIMES_FISCAIS[regimeTributario].crt, avaliacao.codigo, cfop);
      if (!mei.ok) {
        const erro = new Error(mei.motivo);
        erro.code = "NFE_CONFIGURACAO_FISCAL_INCOMPATIVEL";
        throw erro;
      }
    }
    fiscal.uf = uf;
    fiscal.cfop = { venda_interna: interna, venda_interestadual: interestadual };
  }
  return { ...base, fiscal };
}
