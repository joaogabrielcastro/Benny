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

function resolveMunicipio(cliente, cfg) {
  const cMun = onlyDigits(cliente?.codigo_ibge);
  if (cMun.length === 7) return Number(cMun);
  const fallback = onlyDigits(cfg.tomadorCMunFallback || cfg.codigoMunicipioIbge);
  if (fallback.length === 7) return Number(fallback);
  return null;
}

function buildDest(cliente, cfg) {
  const doc = resolveDoc(cliente, cfg);
  if (!doc) return null;

  const cep = resolveCep(cliente, cfg);
  if (!cep) return null;

  const codigoMunicipio = resolveMunicipio(cliente, cfg);
  if (!codigoMunicipio) return null;

  const dest = {
    nome: trunc(cliente?.nome || "Consumidor", 60),
    indicadorIE: 9,
    endereco: {
      logradouro: trunc(cliente?.endereco || "NAO INFORMADO", 60),
      numero: trunc(String(cliente?.numero || "S/N"), 60),
      bairro: trunc(String(cliente?.bairro || "Centro"), 60),
      codigoMunicipio,
      cidade: trunc(String(cliente?.cidade || "Colombo"), 60),
      uf: trunc(String(cliente?.estado || "PR").toUpperCase(), 2),
      cep,
    },
  };

  if (doc.tipo === "CPF") dest.cpf = doc.doc;
  else dest.cnpj = doc.doc;

  if (cliente?.email) dest.email = trunc(cliente.email, 60);
  if (cliente?.complemento) {
    dest.endereco.complemento = trunc(cliente.complemento, 60);
  }

  return dest;
}

function buildItems(produtos, cfg) {
  const cfop = cfg.nfeCfop.length === 4 ? cfg.nfeCfop : "5102";
  // Simples Nacional: 102 (tributada) é o padrão mais comum para venda de peças
  const csosn = cfg.nfeCsosn.length === 3 ? cfg.nfeCsosn : "102";
  const ncmPadrao = cfg.nfeNcm.length === 8 ? cfg.nfeNcm : "87089990";

  return produtos.map((p, idx) => {
    const quantidade = Number(p.quantidade) || 1;
    const valorUnitario = round2(p.valor_unitario);
    const valorTotal = round2(p.valor_total ?? quantidade * valorUnitario);
    const ncmRaw = onlyDigits(p.ncm || p.produto_ncm);
    const ncm = ncmRaw.length === 8 ? ncmRaw : ncmPadrao;

    return {
      codigo: trunc(String(p.codigo || `P${idx + 1}`), 60),
      descricao: trunc(String(p.descricao || "Peca"), 120),
      ncm,
      cfop,
      unidade: "UN",
      quantidade,
      valorUnitario,
      valorTotal,
      csosn,
    };
  });
}

/**
 * Próximo número local (legado / auditoria). A Notaas controla a numeração na SEFAZ.
 */
export async function obterProximoNumeroNfe(tenantId, serie) {
  const cfg = getNuvemFiscalConfig();
  const inicio = Math.max(1, cfg.nfeNumeroInicial);
  const { default: pool } = await import("../../database.js");
  const r = await pool.query(
    `SELECT COALESCE(MAX(
       NULLIF(regexp_replace(COALESCE(numero, ''), '\\D', '', 'g'), '')::integer
     ), 0) AS max_num
     FROM notas_fiscais
     WHERE tenant_id = $1
       AND modelo_documento = 'NFE'
       AND (
         (dados_envio->'infNFe'->'ide'->>'serie')::integer = $2
         OR COALESCE((dados_envio->>'serie')::integer, $2) = $2
       )`,
    [tenantId, serie],
  );
  const maxNum = Number(r.rows[0]?.max_num) || 0;
  return Math.max(maxNum, inicio - 1) + 1;
}

/**
 * Monta corpo POST /nfe/emitir (Notaas) — venda de peças (mod. 55).
 * Emitente, certificado e CSRT ficam no painel Notaas.
 */
export function montarCorpoEmissaoNfe(os, cliente, produtos, opcoes = {}) {
  const cfg = getNuvemFiscalConfig();
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
        "Cliente incompleto para NF-e: CPF/CNPJ, CEP (8 dígitos) e código IBGE do município.",
    };
  }

  const items = buildItems(produtos, cfg);
  const vProd = round2(valor_produtos);
  const referencia =
    opcoes.referencia ||
    gerarReferenciaFiscal(os.id, "NFE", opcoes.nfRegistroId);

  const body = {
    modelo: 55,
    naturezaOperacao: trunc(cfg.nfeNatOp || "VENDA DE MERCADORIA ADQUIRIDA", 60),
    tipoOperacao: 1,
    finalidade: 1,
    consumidorFinal: 1,
    presencaComprador: 1,
    dest,
    items,
    transporte: { modalidadeFrete: 9 },
    pagamentos: [{ tipoPagamento: "01", valor: vProd }],
    infCpl: trunc(`Referente a pecas da OS ${os.numero} (${referencia})`, 5000),
  };

  return { ok: true, body, meta: { referencia, serie: cfg.nfeSerie, nNF: opcoes.nNF ?? null } };
}
