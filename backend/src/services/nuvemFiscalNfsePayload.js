import {
  getNuvemFiscalConfig,
  isNfseIncluirPecas,
} from "../config/nuvemFiscal.js";
import { totaisFiscaisOs, valorEmissaoNfse } from "./osValoresFiscais.js";

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

/**
 * ISS municipal na DPS (Padrão Nacional / ADN).
 * ME/EPP no Simples com tpRetISSQN=1 (sem retenção): não informar pAliq, vBC nem vISSQN
 * (regra ADN quando regApTribISSQN=1 no cadastro do prestador).
 */
function buildTribMunIss(valorServico, cfg) {
  const tpRetISSQN = cfg.tpRetISSQN ?? 1;
  const tribMun = {
    tribISSQN: 1,
    tpRetISSQN,
  };

  const vBC = roundMoney(valorServico);
  const pAliq = roundMoney(cfg.aliquotaIss);
  const vISSQN =
    pAliq > 0 && vBC > 0 ? roundMoney((vBC * pAliq) / 100) : 0;

  const podeInformarAliquotaNaDps =
    cfg.forcarAliquotaIssDps || tpRetISSQN !== 1;

  if (podeInformarAliquotaNaDps && pAliq > 0) {
    tribMun.pAliq = pAliq;
    if (vBC > 0) tribMun.vBC = vBC;
    if (vISSQN > 0) tribMun.vISSQN = vISSQN;
  }

  const vISSQNDps = podeInformarAliquotaNaDps ? vISSQN : 0;
  return { tribMun, vISSQN: vISSQNDps };
}

function resolveMunicipioIbgePrestacao(cfg) {
  const a = cfg.codigoMunicipioIbge;
  if (a && a.length === 7) return a;
  const b = cfg.tomadorCMunFallback;
  if (b && b.length === 7) return b;
  return "";
}

/** IBGE do município do endereço do tomador (deve corresponder ao CEP). */
function resolveMunicipioIbgeTomador(cliente, cfg) {
  const doCliente = onlyDigits(cliente?.codigo_ibge);
  if (doCliente.length === 7) return doCliente;
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

function buildDescricaoNfse(os, servicos, produtos, incluirPecas) {
  const itens = [];
  for (const s of servicos || []) {
    const qtd = Number(s.quantidade) > 1 ? ` (${s.quantidade}x)` : "";
    itens.push(`${String(s.descricao || "").trim()}${qtd}`);
  }
  if (incluirPecas && produtos?.length) {
    for (const p of produtos) {
      const qtd = Number(p.quantidade) > 1 ? ` (${p.quantidade}x)` : "";
      itens.push(`${String(p.descricao || "").trim()}${qtd}`);
    }
  }
  const detalhe = itens.length
    ? itens.join("; ")
    : "manutencao e reparo veicular";
  return trunc(
    `Servicos prestados conforme OS ${os.numero}: ${detalhe}`,
    2000,
  );
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
 * Monta o corpo JSON do POST /nfse/dps (NfseDpsPedidoEmissao).
 * Com NF-e desligada: valor total da OS (serviços + peças) na mesma NFS-e.
 */
export function montarCorpoEmissaoNfseDps(
  os,
  cliente,
  produtos,
  servicos,
  opcoes = {},
) {
  const cfg = getNuvemFiscalConfig();
  const incluirPecas = opcoes.incluirPecas ?? isNfseIncluirPecas();
  const totais = totaisFiscaisOs({ ...os, produtos, servicos });
  const valorNota = valorEmissaoNfse(totais, incluirPecas);

  if (valorNota <= 0) {
    return {
      ok: false,
      erro: incluirPecas
        ? "Esta OS não possui valor para emitir NFS-e."
        : "Esta OS não possui valor de mão de obra (serviços) para emitir NFS-e.",
    };
  }

  if (!incluirPecas && (!servicos?.length || totais.valor_servicos <= 0)) {
    return {
      ok: false,
      erro:
        "Esta OS não possui valor de mão de obra (serviços) para emitir NFS-e.",
    };
  }

  const cMunPrestacao = resolveMunicipioIbgePrestacao(cfg);
  if (!cMunPrestacao) {
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
  const cMunTomador = resolveMunicipioIbgeTomador(cliente, cfg);
  if (!cMunTomador) {
    return {
      ok: false,
      erro:
        "Código IBGE do município do cliente não encontrado. Edite o cliente, use Buscar no CEP e salve novamente.",
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

  const valorServ = valorNota;
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
      endNac: { cMun: cMunTomador, CEP: cep },
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
        // Padrão Nacional (POST /nfse/dps): TRegTrib aceita apenas regEspTrib.
        // opSimpNac e regApTribSN configuram no painel Nuvem → empresa → NFS-e.
        regTrib: {
          regEspTrib: cfg.regEspTrib,
        },
      },
      toma,
      serv: {
        locPrest: { cLocPrestacao: cMunPrestacao },
        cServ: {
          cTribNac: cfg.cTribNac,
          cNBS: cfg.cNbs,
          xDescServ: buildDescricaoNfse(os, servicos, produtos, incluirPecas),
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
