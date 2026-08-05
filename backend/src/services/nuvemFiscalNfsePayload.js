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

function resolveMunicipioIbgePrestacao(cfg) {
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

function competenciaAtual(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Referência única por tentativa. Máx. 50 caracteres. */
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
 * Monta o corpo JSON do POST /api/v1/emitir (Notaas).
 * Com NF-e desligada: valor total da OS (serviços + peças) na mesma NFS-e.
 * Mantém o nome montarCorpoEmissaoNfseDps por compatibilidade.
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
        "Defina NOTAAS_CODIGO_MUNICIPIO_IBGE (7 dígitos IBGE do município da oficina).",
    };
  }

  const doc = resolveDocTomador(cliente, cfg);
  if (!doc) {
    return {
      ok: false,
      erro:
        "Cliente sem CPF/CNPJ válido. Cadastre no cliente ou defina NOTAAS_TOMADOR_CPF / NOTAAS_TOMADOR_CNPJ.",
    };
  }

  const nome = trunc(cliente?.nome || "Consumidor", 300);
  const tomador = {
    nome,
    email: cliente?.email ? trunc(cliente.email, 80) : undefined,
    telefone: onlyDigits(cliente?.telefone) || undefined,
  };
  if (doc.tipo === "CPF") tomador.cpf = doc.doc;
  else tomador.cnpj = doc.doc;

  const cep = resolveCepTomador(cliente, cfg);
  const endereco = {
    logradouro: logradouroCliente(cliente),
    numero: trunc(String(cliente?.numero || "S/N"), 60),
    complemento: cliente?.complemento
      ? trunc(cliente.complemento, 156)
      : undefined,
    bairro: trunc(String(cliente?.bairro || "Centro"), 60),
    cidade: trunc(String(cliente?.cidade || "").trim(), 100) || undefined,
    uf: trunc(String(cliente?.uf || cliente?.estado || "").trim().toUpperCase(), 2) || undefined,
    cep: cep || undefined,
  };
  if (
    endereco.logradouro ||
    endereco.cidade ||
    endereco.uf ||
    endereco.cep
  ) {
    tomador.endereco = endereco;
  }

  const servico = {
    descricao: buildDescricaoNfse(os, servicos, produtos, incluirPecas),
    codigo: cfg.cTribNac,
    localPrestacao: cMunPrestacao,
  };
  if (cfg.cNbs && cfg.cNbs.length === 9) {
    servico.nbs = cfg.cNbs;
  }

  const issRetido =
    cfg.issRetido === true || cfg.tpRetISSQN === 2 || cfg.tpRetISSQN === 3;

  const body = {
    tomador,
    servico,
    valores: {
      total: roundMoney(valorNota),
      aliquotaIss: roundMoney(cfg.aliquotaIss),
      issRetido,
    },
    competencia: competenciaAtual(),
    referencia:
      opcoes.referencia ||
      gerarReferenciaFiscal(os.id, "NFSE", opcoes.nfRegistroId),
  };

  return { ok: true, body };
}
