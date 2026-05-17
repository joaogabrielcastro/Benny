import { getNuvemFiscalConfig } from "../config/nuvemFiscal.js";

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function trunc(s, max) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
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

function buildDescricaoServico(os, produtos, servicos) {
  const linhas = [];
  if (servicos?.length) {
    for (const s of servicos) {
      linhas.push(`${s.codigo} ${s.descricao} (${s.quantidade}x)`);
    }
  }
  if (produtos?.length) {
    for (const p of produtos) {
      linhas.push(`${p.codigo} ${p.descricao} (${p.quantidade}x)`);
    }
  }
  const bloco = linhas.length ? linhas.join("; ") : "Servicos e pecas conforme OS.";
  return trunc(`OS ${os.numero} — ${bloco}`, 2000);
}

function logradouroCliente(cliente) {
  const e = String(cliente?.endereco || "").trim();
  if (e) return trunc(e, 255);
  return "NAO INFORMADO";
}

/** Referência única por tentativa (Nuvem Fiscal não permite reutilizar). Máx. 50 caracteres. */
export function gerarReferenciaNfse(osId, nfRegistroId = null) {
  const sufixo = Date.now().toString(36);
  const base = nfRegistroId
    ? `benny-os-${osId}-nf${nfRegistroId}-${sufixo}`
    : `benny-os-${osId}-${sufixo}`;
  return trunc(base, 50);
}

/**
 * Monta o corpo JSON do POST /nfse/dps (NfseDpsPedidoEmissao).
 * @param {{ referencia?: string }} [opcoes] — referencia única; se omitida, é gerada automaticamente
 * @returns {{ ok: true, body: object } | { ok: false, erro: string }}
 */
export function montarCorpoEmissaoNfseDps(
  os,
  cliente,
  produtos,
  servicos,
  opcoes = {},
) {
  const cfg = getNuvemFiscalConfig();
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
        "CEP do tomador (cliente) inválido ou ausente. Cadastre o CEP com 8 dígitos no cliente, atualize-o na OS abaixo ou defina NUVEM_FISCAL_TOMADOR_CEP no servidor (ex.: homologação).",
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

  const valorServ = Math.max(0, Number(os.valor_total) || 0);
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
      opcoes.referencia || gerarReferenciaNfse(os.id, opcoes.nfRegistroId),
    infDPS: {
      tpAmb,
      dhEmi,
      verAplic: "Benny/1",
      dCompet,
      prest: {
        CNPJ: cfg.empresaCnpj,
        regTrib: { regEspTrib: 0 },
      },
      toma,
      serv: {
        locPrest: { cLocPrestacao: cMun },
        cServ: {
          cTribNac: cfg.cTribNac,
          cNBS: cfg.cNbs,
          xDescServ: buildDescricaoServico(os, produtos, servicos),
        },
      },
      valores: {
        vServPrest: { vServ: valorServ },
        trib: {
          tribMun: {
            tribISSQN: 1,
            tpRetISSQN: 1,
          },
          // Layout Nacional: totTrib é choice — enviar só vTotTrib (valores por esfera)
          totTrib: {
            vTotTrib: {
              vTotTribFed: 0,
              vTotTribEst: 0,
              vTotTribMun: 0,
            },
          },
        },
      },
    },
  };

  return { ok: true, body };
}
