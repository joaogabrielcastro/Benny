import { randomInt } from "node:crypto";
import { getBrasilNfeConfig } from "../config/brasilNfe.js";
import { getNuvemFiscalConfig } from "../config/nuvemFiscal.js";
import { gerarReferenciaFiscal } from "./nuvemFiscalNfsePayload.js";
import { totaisFiscaisOs } from "./osValoresFiscais.js";
import { avaliarNcmItensNfe, normalizarNcmInformado } from "../domain/ncm.js";
import { validarDestinatarioNfe } from "../domain/destinatarioNfe.js";
import { validarConsumidorFinalOperacao } from "../domain/operacaoFiscalNfe.js";

function trunc(s, max) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function clienteFiscal(dest) {
  const body = {
    nome: dest.nome,
    indicadorIE: dest.indicadorIe,
    endereco: {
      logradouro: dest.logradouro,
      numero: dest.numero,
      bairro: dest.bairro,
      codigoMunicipio: Number(dest.codigoIbge),
      cidade: dest.cidade,
      uf: dest.uf,
      cep: dest.cep,
    },
  };
  if (dest.tipoDocumento === "CPF") body.cpf = dest.documento;
  else body.cnpj = dest.documento;
  if (dest.ie) body.ie = dest.ie;
  if (dest.email) body.email = dest.email;
  if (dest.complemento) body.endereco.complemento = dest.complemento;
  return body;
}

function buildItems(produtos, cfg, codigoIcms, cfop) {
  const situacao = String(codigoIcms);

  return produtos.map((p, idx) => {
    const quantidade = Number(p.quantidade) || 1;
    const valorUnitario = round2(p.valor_unitario);
    const valorTotal = round2(p.valor_total ?? quantidade * valorUnitario);
    const ncm = normalizarNcmInformado(p.ncm || p.produto_ncm).ncm;

    return {
      codigo: trunc(String(p.codigo || `P${idx + 1}`), 60),
      descricao: trunc(String(p.descricao || "Peca"), 120),
      ncm,
      cfop,
      unidade: "UN",
      quantidade,
      valorUnitario,
      valorTotal,
      situacao,
    };
  });
}

export { obterProximoNumeroNfe } from "./fiscal/numeracaoNfe.js";

function agoraBrasilIso() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (tipo) => partes.find((p) => p.type === tipo)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}-03:00`;
}

/**
 * Monta corpo POST /EnviarNotaFiscal (Brasil NFe) — venda de peças (mod. 55).
 * Emitente, IE e certificado ficam no painel da Brasil NFe.
 */
export function montarCorpoEmissaoNfe(os, cliente, produtos, opcoes = {}) {
  const cfg = getNuvemFiscalConfig();
  const brasil = getBrasilNfeConfig();
  const { valor_produtos } = totaisFiscaisOs({ ...os, produtos });

  if (!opcoes.nNF) {
    return { ok: false, erro: "Número da NF-e ausente. Tente emitir novamente." };
  }

  if (!produtos?.length || valor_produtos <= 0) {
    return {
      ok: false,
      erro: "Esta OS não possui valor de peças/produtos para emitir NF-e.",
    };
  }

  const ncmInvalido = avaliarNcmItensNfe(produtos);
  if (ncmInvalido) {
    return {
      ok: false,
      erro: ncmInvalido.message,
      code: ncmInvalido.code,
      produtos: ncmInvalido.produtos,
    };
  }

  const destCheck = validarDestinatarioNfe(cliente);
  if (!destCheck.ok) {
    return {
      ok: false,
      erro: destCheck.message,
      code: destCheck.code,
      campos: destCheck.campos,
    };
  }
  const dest = clienteFiscal(destCheck.destinatario);
  const icms = opcoes.configFiscal?.icms;
  if (!icms?.codigo || !["CSOSN", "CST"].includes(icms.tipo)) {
    return {
      ok: false,
      erro: "A configuração fiscal da empresa está incompleta.",
      code: "NFE_CONFIGURACAO_FISCAL_INCOMPLETA",
      campos: [
        {
          campo: "icms",
          motivo: "Situação tributária padrão não informada.",
        },
      ],
    };
  }

  const cfop = String(opcoes.configFiscal?.cfopResolvido || "");
  if (!/^\d{4}$/.test(cfop)) {
    return {
      ok: false,
      erro: "A configuração fiscal da empresa está incompleta.",
      code: "NFE_CONFIGURACAO_FISCAL_INCOMPLETA",
      campos: [{ campo: "cfop", motivo: "CFOP da operação não informado." }],
    };
  }
  const operacao = validarConsumidorFinalOperacao({
    consumidorFinal: opcoes.consumidorFinal,
    ufEmitente: opcoes.configFiscal?.ufEmitente,
    ufDestino: dest.endereco.uf,
    indicadorIe: dest.indicadorIE,
  });
  if (!operacao.ok) {
    return {
      ok: false,
      erro: operacao.message,
      code: operacao.code,
      campos: operacao.campos,
    };
  }

  const items = buildItems(produtos, cfg, icms.codigo, cfop);
  const vProd = round2(valor_produtos);
  const referencia =
    opcoes.referencia ||
    gerarReferenciaFiscal(os.id, "NFE", opcoes.nfRegistroId);
  const agora = agoraBrasilIso();

  const body = {
    Serie: cfg.nfeSerie || 1,
    Numero: Number(opcoes.nNF),
    Codigo: String(randomInt(10000000, 99999999)),
    DataEmissao: agora,
    DataEntradaSaida: agora,
    IndicadorPresenca: 1,
    ConsumidorFinal: operacao.consumidorFinal,
    CalcularIBPT: true,
    NaturezaOperacao: trunc(cfg.nfeNatOp || "VENDA DE MERCADORIA ADQUIRIDA", 60),
    ModeloDocumento: 55,
    Finalidade: 1,
    TipoAmbiente: brasil.tipoAmbiente,
    IdentificadorInterno: trunc(referencia, 60),
    Observacao: trunc(`Referente a pecas da OS ${os.numero}`, 5000),
    EnviarEmail: false,
    Cliente: {
      CpfCnpj: dest.cpf || dest.cnpj,
      NmCliente: dest.nome,
      IndicadorIe: dest.indicadorIE,
      ...(dest.ie ? { Ie: dest.ie } : {}),
      Endereco: {
        Cep: dest.endereco.cep,
        Logradouro: dest.endereco.logradouro,
        Numero: dest.endereco.numero,
        Complemento: dest.endereco.complemento || undefined,
        Bairro: dest.endereco.bairro,
        CodMunicipio: String(dest.endereco.codigoMunicipio),
        Municipio: dest.endereco.cidade,
        Uf: dest.endereco.uf,
        CodPais: 1058,
        Pais: "BRASIL",
      },
      ...(dest.email ? { Contato: { Email: dest.email } } : {}),
    },
    Produtos: items.map((item) => ({
      NmProduto: item.descricao,
      CodProdutoServico: item.codigo,
      NCM: item.ncm,
      UnidadeComercial: item.unidade,
      Quantidade: item.quantidade,
      ValorUnitario: item.valorUnitario,
      ValorTotal: item.valorTotal,
      CFOP: Number(item.cfop),
      OrigemProduto: 0,
      Imposto: {
        ICMS: { CodSituacaoTributaria: item.situacao },
      },
    })),
    Pagamentos: [
      {
        IndicadorPagamento: 0,
        FormaPagamento: "01",
        Descricao: "Dinheiro",
        VlPago: vProd,
        VlTroco: 0,
      },
    ],
    Transporte: { ModalidadeFrete: 9 },
  };

  return {
    ok: true,
    body,
    meta: { referencia, serie: cfg.nfeSerie, nNF: Number(opcoes.nNF) },
  };
}
