import { getNuvemFiscalConfig } from "../config/nuvemFiscal.js";
import { totaisFiscaisOs } from "./osValoresFiscais.js";

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function trunc(s, max) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/** ISS na DPS: base, alíquota e valor (layout Nacional exige para aparecer na NFS-e). */
function buildTribMunIss(valorServico, cfg) {
  const vBC = roundMoney(valorServico);
  const pAliq = roundMoney(cfg.aliquotaIss);
  const vISSQN = pAliq > 0 && vBC > 0 ? roundMoney((vBC * pAliq) / 100) : 0;

  const tribMun = {
    tribISSQN: 1,
    tpRetISSQN: 1,
  };

  if (pAliq > 0) {
    tribMun.pAliq = pAliq;
    tribMun.pAliqAplic = pAliq;
  }
  if (vBC > 0) tribMun.vBC = vBC;
  if (vISSQN > 0) tribMun.vISSQN = vISSQN;

  return { tribMun, vISSQN };
}

function resolveMunicipioIbge(cfg) {
  const a = cfg.codigoMunicipioIbge;
  if (a && a.length === 7) return a;
  const b = cfg.tomadorCMunFallback;
  if (b && b.length === 7) return b;
  return "";
}

function resolveCepTomador(cliente, cfg) {
  const c = onlyDigits(cliente?.cep);
  if (c.length === 8) return c;
  const f = cfg.tomadorCepFallback;
  if (f && f.length === 8) return f;
  return "";
}

function resolveDocTomador(cliente, cfg) {
  const d = onlyDigits(cliente?.cpf_cnpj);
  if (d.length === 11) return { tipo: "CPF", doc: d };
  if (d.length === 14) return { tipo: "CNPJ", doc: d };
  if (cfg.tomadorCpfFallback.length === 11)
    return { tipo: "CPF", doc: cfg.tomadorCpfFallback };
  if (cfg.tomadorCnpjFallback.length === 14)
    return { tipo: "CNPJ", doc: cfg.tomadorCnpjFallback };
  return null;
}

function buildDescricaoServico(os, servicos) {
  const linhas = [];
  if (servicos?.length) {
    for (const s of servicos) {
      linhas.push(`${s.codigo} ${s.descricao} (${s.quantidade}x)`);
    }
  }
  const bloco = linhas.length
    ? linhas.join("; ")
    : "Mao de obra conforme ordem de servico.";
  return trunc(`OS ${os.numero} — ${bloco}`, 2000);
}

function logradouroCliente(cliente) {
  const e = String(cliente?.endereco || "").trim();
  if (e) return trunc(e, 255);
  return "NAO INFORMADO";
}

/** Referência única por tentativa (Nuvem Fiscal não permite reutilizar). Máx. 50 caracteres. */
export function gerarReferenciaFiscal(osId, modelo, nfRegistroId = null) {
  const tag = modelo === "NFE" ? "nfe" : "nfse";
  const sufixo = Date.now().toString(36);
  const base = nfRegistroId
    ? `benny-os-${osId}-${tag}-nf${nfRegistroId}-${sufixo}`
    : `benny-os-${osId}-${tag}-${sufixo}`;
  return trunc(base, 50);
}

/** @deprecated use gerarReferenciaFiscal */
export function gerarReferenciaNfse(osId, nfRegistroId = null) {
  return gerarReferenciaFiscal(osId, "NFSE", nfRegistroId);
}

/**
 * Monta o corpo JSON do POST /nfse/dps (NfseDpsPedidoEmissao) — somente mão de obra.
 */
export function montarCorpoEmissaoNfseDps(
  os,
  cliente,
  produtos,
  servicos,
  opcoes = {},
) {
  const cfg = getNuvemFiscalConfig();
  const { valor_servicos } = totaisFiscaisOs({ ...os, produtos, servicos });

  if (!servicos?.length || valor_servicos <= 0) {
    return {
      ok: false,
      erro:
        "Esta OS não possui valor de mão de obra (serviços) para emitir NFS-e.",
    };
  }

  const cMun = resolveMunicipioIbge(cfg);
  if (!cMun) {
    return {
      ok: false,
      erro:
        "Defina NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE (7 dígitos) ou NUVEM_FISCAL_TOMADOR_C_MUN.",
    };
  }
  const cep = resolveCepTomador(cliente, cfg);
  if (!cep) {
    return {
      ok: false,
      erro:
        "CEP do tomador (cliente) inválido ou ausente. Cadastre o CEP com 8 dígitos no cliente.",
    };
  }
  const doc = resolveDocTomador(cliente, cfg);
  if (!doc) {
    return {
      ok: false,
      erro:
        "Cliente sem CPF/CNPJ válido. Cadastre ou defina NUVEM_FISCAL_TOMADOR_CPF ou NUVEM_FISCAL_TOMADOR_CNPJ.",
    };
  }

  const valorServ = valor_servicos;
  const { tribMun, vISSQN } = buildTribMunIss(valorServ, cfg);
  const now = new Date();
  const dhEmi = now.toISOString();
  const dCompet = dhEmi.slice(0, 10);
  const tpAmb = cfg.ambiente === "producao" ? 1 : 2;

  const toma = {
    orgaoPublico: false,
    xNome: trunc(cliente?.nome || "Consumidor", 300),
    fone: onlyDigits(cliente?.telefone) || undefined,
    email: cliente?.email ? trunc(cliente.email, 80) : undefined,
    end: {
      endNac: { cMun, CEP: cep },
      xLgr: logradouroCliente(cliente),
      nro: trunc(String(cliente?.numero || "S/N"), 60),
      xCpl: cliente?.complemento
        ? trunc(cliente.complemento, 156)
        : undefined,
      xBairro: trunc(String(cliente?.bairro || "Centro"), 60),
    },
  };
  if (doc.tipo === "CPF") toma.CPF = doc.doc;
  else toma.CNPJ = doc.doc;

  const body = {
    provedor: cfg.provedor,
    ambiente: cfg.ambiente,
    referencia:
      opcoes.referencia ||
      gerarReferenciaFiscal(os.id, "NFSE", opcoes.nfRegistroId),
    infDPS: {
      tpAmb,
      dhEmi,
      verAplic: "Benny/1",
      dCompet,
      prest: {
        CNPJ: cfg.empresaCnpj,
        regTrib: {
          opSimpNac: cfg.opSimpNac,
          regApTribSN: cfg.regApTribSN,
          regEspTrib: 0,
        },
      },
      toma,
      serv: {
        locPrest: { cLocPrestacao: cMun },
        cServ: {
          cTribNac: cfg.cTribNac,
          cNBS: cfg.cNbs,
          xDescServ: buildDescricaoServico(os, servicos),
        },
      },
      valores: {
        vServPrest: { vServ: valorServ },
        trib: {
          tribMun,
          totTrib: {
            vTotTrib: {
              vTotTribFed: 0,
              vTotTribEst: 0,
              vTotTribMun: vISSQN,
            },
          },
        },
      },
    },
  };

  return { ok: true, body };
}
