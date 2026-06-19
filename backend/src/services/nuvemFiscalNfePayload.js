import pool from "../../database.js";
import { getNuvemFiscalConfig } from "../config/nuvemFiscal.js";
import { gerarReferenciaFiscal } from "./nuvemFiscalNfsePayload.js";
import { totaisFiscaisOs } from "./osValoresFiscais.js";

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function trunc(s, max) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function resolveCep(cliente, cfg) {
  const c = onlyDigits(cliente?.cep);
  if (c.length === 8) return c;
  return cfg.tomadorCepFallback?.length === 8 ? cfg.tomadorCepFallback : "";
}

function resolveDoc(cliente, cfg) {
  const d = onlyDigits(cliente?.cpf_cnpj);
  if (d.length === 11) return { tipo: "CPF", doc: d };
  if (d.length === 14) return { tipo: "CNPJ", doc: d };
  if (cfg.tomadorCpfFallback.length === 11)
    return { tipo: "CPF", doc: cfg.tomadorCpfFallback };
  if (cfg.tomadorCnpjFallback.length === 14)
    return { tipo: "CNPJ", doc: cfg.tomadorCnpjFallback };
  return null;
}

function randomCNF() {
  return String(Math.floor(Math.random() * 89_999_999) + 10_000_000);
}

function buildDest(cliente, cfg) {
  const doc = resolveDoc(cliente, cfg);
  if (!doc) return null;

  const cep = resolveCep(cliente, cfg);
  if (!cep) return null;

  const cMun =
    onlyDigits(cliente?.codigo_ibge).length === 7
      ? onlyDigits(cliente.codigo_ibge)
      : cfg.tomadorCMunFallback || "";
  if (cMun.length !== 7) return null;

  const dest = {
    xNome: trunc(cliente?.nome || "Consumidor", 60),
    indIEDest: 9,
    enderDest: {
      xLgr: trunc(cliente?.endereco || "NAO INFORMADO", 60),
      nro: trunc(String(cliente?.numero || "S/N"), 60),
      xBairro: trunc(String(cliente?.bairro || "Centro"), 60),
      cMun,
      xMun: trunc(String(cliente?.cidade || "Colombo"), 60),
      UF: trunc(String(cliente?.estado || "PR").toUpperCase(), 2),
      CEP: cep,
      cPais: "1058",
      xPais: "BRASIL",
    },
  };
  if (doc.tipo === "CPF") dest.CPF = doc.doc;
  else dest.CNPJ = doc.doc;
  if (cliente?.email) dest.email = trunc(cliente.email, 60);
  return dest;
}

function buildDetItens(produtos, cfg) {
  const cfop = cfg.nfeCfop.length === 4 ? cfg.nfeCfop : "5102";
  const csosn = cfg.nfeCsosn.length === 3 ? cfg.nfeCsosn : "103";
  const ncmPadrao = cfg.nfeNcm.length === 8 ? cfg.nfeNcm : "87089990";

  return produtos.map((p, idx) => {
    const qCom = Number(p.quantidade) || 1;
    const vUnCom = round2(p.valor_unitario);
    const vProd = round2(p.valor_total ?? qCom * vUnCom);
    const ncmRaw = onlyDigits(p.ncm || p.produto_ncm);
    const ncm = ncmRaw.length === 8 ? ncmRaw : ncmPadrao;

    return {
      nItem: idx + 1,
      prod: {
        cProd: trunc(String(p.codigo || `P${idx + 1}`), 60),
        cEAN: "SEM GTIN",
        xProd: trunc(String(p.descricao || "Peca"), 120),
        NCM: ncm,
        CFOP: cfop,
        uCom: "UN",
        qCom,
        vUnCom,
        vProd,
        cEANTrib: "SEM GTIN",
        uTrib: "UN",
        qTrib: qCom,
        vUnTrib: vUnCom,
        indTot: 1,
      },
      imposto: {
        ICMS: {
          ICMSSN102: {
            orig: 0,
            CSOSN: csosn,
          },
        },
        PIS: {
          PISNT: { CST: "07" },
        },
        COFINS: {
          COFINSNT: { CST: "07" },
        },
      },
    };
  });
}

/**
 * Próximo número NF-e (nNF) por tenant/série — evita duplicidade entre emissões do Benny.
 */
export async function obterProximoNumeroNfe(tenantId, serie) {
  const cfg = getNuvemFiscalConfig();
  const inicio = Math.max(1, cfg.nfeNumeroInicial);
  const r = await pool.query(
    `SELECT COALESCE(MAX((dados_envio->'infNFe'->'ide'->>'nNF')::integer), 0) AS max_num
     FROM notas_fiscais
     WHERE tenant_id = $1
       AND modelo_documento = 'NFE'
       AND dados_envio->'infNFe'->'ide'->>'nNF' IS NOT NULL
       AND (dados_envio->'infNFe'->'ide'->>'serie')::integer = $2`,
    [tenantId, serie],
  );
  const maxNum = Number(r.rows[0]?.max_num) || 0;
  return Math.max(maxNum, inicio - 1) + 1;
}

/**
 * Monta corpo POST /nfe — venda de peças (Simples Nacional, CSOSN 103).
 */
export function montarCorpoEmissaoNfe(os, cliente, produtos, opcoes = {}) {
  const cfg = getNuvemFiscalConfig();
  const nNF = parseInt(String(opcoes.nNF ?? ""), 10);
  if (!Number.isFinite(nNF) || nNF < 1) {
    return {
      ok: false,
      erro:
        "Número da NF-e (nNF) não definido. Verifique a numeração ou NUVEM_FISCAL_NFE_NUMERO_INICIAL.",
    };
  }

  if (!cfg.emitenteIe) {
    return {
      ok: false,
      erro:
        "Inscrição Estadual (IE) do emitente é obrigatória na NF-e. Defina NUVEM_FISCAL_EMITENTE_IE no servidor (somente dígitos, igual ao cadastro SEFAZ / painel Nuvem).",
    };
  }
  const { valor_produtos } = totaisFiscaisOs({ ...os, produtos });

  if (!produtos?.length || valor_produtos <= 0) {
    return {
      ok: false,
      erro: "Esta OS não possui valor de peças/produtos para emitir NF-e.",
    };
  }

  const dest = buildDest(cliente, cfg);
  if (!dest) {
    return {
      ok: false,
      erro:
        "Cliente incompleto para NF-e: CPF/CNPJ, CEP (8 dígitos) e município (NUVEM_FISCAL_CODIGO_MUNICIPIO_IBGE).",
    };
  }

  const det = buildDetItens(produtos, cfg);
  const vProd = round2(valor_produtos);
  const now = new Date();
  const dhEmi = now.toISOString();
  const tpAmb = cfg.ambiente === "producao" ? 1 : 2;
  const cMunFG = cfg.codigoMunicipioIbge;

  const body = {
    ambiente: cfg.ambiente,
    referencia:
      opcoes.referencia ||
      gerarReferenciaFiscal(os.id, "NFE", opcoes.nfRegistroId),
    infNFe: {
      versao: "4.00",
      ide: {
        cUF: cfg.cuf,
        cNF: randomCNF(),
        natOp: trunc(cfg.nfeNatOp, 60),
        mod: 55,
        serie: cfg.nfeSerie,
        nNF,
        dhEmi,
        tpNF: 1,
        idDest: 1,
        cMunFG,
        tpImp: 1,
        tpEmis: 1,
        tpAmb,
        finNFe: 1,
        indFinal: 1,
        indPres: 1,
        procEmi: 0,
        verProc: "Benny/1",
      },
      emit: {
        CNPJ: cfg.empresaCnpj,
        IE: cfg.emitenteIe,
        CRT: cfg.nfeCrt,
      },
      dest,
      det,
      total: {
        ICMSTot: {
          vBC: 0,
          vICMS: 0,
          vICMSDeson: 0,
          vFCP: 0,
          vBCST: 0,
          vST: 0,
          vFCPST: 0,
          vFCPSTRet: 0,
          vProd,
          vFrete: 0,
          vSeg: 0,
          vDesc: 0,
          vII: 0,
          vIPI: 0,
          vIPIDevol: 0,
          vPIS: 0,
          vCOFINS: 0,
          vOutro: 0,
          vNF: vProd,
        },
      },
      transp: { modFrete: 9 },
      pag: {
        detPag: [
          {
            tPag: "01",
            vPag: vProd,
          },
        ],
      },
      infAdic: {
        infCpl: trunc(`Referente a pecas da OS ${os.numero}`, 5000),
      },
    },
  };

  return { ok: true, body };
}
