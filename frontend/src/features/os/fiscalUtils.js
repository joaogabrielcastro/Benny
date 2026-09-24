export function rotuloFonteTributo(fonte) {
  if (fonte === "nuvem") return " · Notaas";
  if (fonte === "estimativa") return " · estimativa";
  return "";
}

export function formatarAliquota(p) {
  if (p == null || p === "") return "";
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/**
 * Só erros de CEP/endereço/município do **tomador (cliente)**.
 * Não usar match frouxo em "município"/"tomador": mensagens do prestador
 * (ex. E0120 IM / município emissor) disparavam o bloco de CEP por engano.
 */
export function nfErroEnderecoTomador(nota) {
  const msg = normalizarMsgFiscal(
    mensagemRejeicaoNota(nota) || nota?.observacoes,
  );
  if (!msg) return false;

  // Cadastro do prestador / CNC / IM — não é endereço do cliente
  if (
    /\be0120\b/.test(msg) ||
    /im do prestador/.test(msg) ||
    /inscri[cç][aã]o municipal/.test(msg) ||
    /munic[ií]pio emissor/.test(msg) ||
    /cnc nfs-?e/.test(msg) ||
    /informa[cç][oõ]es complementares registradas no cnc/.test(msg)
  ) {
    return false;
  }

  const sinaisTomador = [
    /\bcep\b.{0,40}(tomador|cliente|inv[aá]lid|ausente|obrigat|n[aã]o informado)/,
    /(tomador|cliente).{0,40}\bcep\b/,
    /munic[ií]pio.{0,40}(tomador|cliente)/,
    /(tomador|cliente).{0,40}munic[ií]pio/,
    /endere[cç]o.{0,40}(tomador|cliente)/,
    /(tomador|cliente).{0,40}endere[cç]o/,
    /c[oó]digo.?ibge.{0,40}(tomador|cliente|ausente|inv[aá]lid)/,
    /(tomador|cliente).{0,40}(ibge|cmun)/,
    /\bendnac\b/,
    /cep do tomador/,
  ];
  return sinaisTomador.some((re) => re.test(msg));
}

function normalizarMsgFiscal(s) {
  return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Texto único do motivo de rejeição (prioriza detalhe da SEFAZ/Nuvem). */
export function mensagemRejeicaoNota(nota) {
  const detalhe = String(nota?.detalhe_rejeicao || "").trim();
  const obs = String(nota?.observacoes || "").trim();
  return detalhe || obs;
}

/** Observação gerada pelo próprio status — já aparece no selo da nota. */
const OBS_AUTOMATICA = /^(nfs-?e|nf-?e)\s+(autorizada|cancelada|substitu[ií]da)\b/;

/** Observações só quando não repetem o status nem o motivo de rejeição. */
export function mostrarObservacoesNota(nota) {
  const obs = String(nota?.observacoes || "").trim();
  if (!obs) return false;
  if (nota?.status_nf !== "rejeitada") {
    return !OBS_AUTOMATICA.test(normalizarMsgFiscal(obs));
  }
  const motivo = mensagemRejeicaoNota(nota);
  if (!motivo) return true;
  const a = normalizarMsgFiscal(motivo);
  const b = normalizarMsgFiscal(obs);
  if (b.startsWith(a) || b.includes(a)) return false;
  return a !== b;
}

/** Dica operacional para códigos comuns de rejeição NFS-e. */
export function dicaRejeicaoNfse(nota) {
  const msg = mensagemRejeicaoNota(nota).toLowerCase();
  if (msg.includes("e2404")) {
    return "No painel Notaas, confira numeração/série da NFS-e e o próximo número. Aguarde 1–2 min entre tentativas antes de Reemitir.";
  }
  if (msg.includes("e0120") || msg.includes("im do prestador")) {
    return "No painel Notaas → empresa Bennys → Inscrição Municipal: deixe em branco (Colombo/CNC sem complemento de IM). Salve e use Reemitir na OS.";
  }
  return null;
}

/** NFS-e autorizada com valor menor que o total da OS (ex.: sandbox só serviços). */
export function nfseValorIncompleto(os, nota, nfseIncluirPecas) {
  if (!nfseIncluirPecas || !nota || nota.status_nf !== "autorizada") return false;
  const esperado = Number(os?.valor_total) || 0;
  const emitido = Number(nota?.valor_total ?? nota?.valor_liquido) || 0;
  return esperado > 0 && emitido + 0.009 < esperado;
}

function rotuloNota(nf) {
  if (nf?.provedor === "brasil_nfe" || nf?.modelo_documento === "NFE") {
    return "Brasil NFe";
  }
  return "Notaas";
}

export function mensagemProdutosSemNcm(data) {
  const code = data?.code;
  if (code !== "NFE_PRODUTO_SEM_NCM" && code !== "NFE_PRODUTO_SEM_CADASTRO_FISCAL") {
    return null;
  }
  const nomes = (Array.isArray(data.produtos) ? data.produtos : [])
    .map((p) => p?.descricao || p?.codigo)
    .filter(Boolean);
  const lista = nomes.length ? `\n\n${nomes.map((n) => `• ${n}`).join("\n")}` : "";
  if (code === "NFE_PRODUTO_SEM_CADASTRO_FISCAL") {
    return `Não foi possível emitir a NF-e.\n\nAlgumas peças não estão ligadas a um produto do catálogo:${lista}\n\nVincule o produto e informe o NCM. Depois tente novamente.`;
  }
  return `Não foi possível emitir a NF-e.\n\nAlguns produtos estão sem NCM:${lista}\n\nProdutos → editar produto → informar NCM. Depois tente novamente.`;
}

const ROTULO_CAMPO_DEST = {
  nome: "Nome",
  cpf_cnpj: "CPF/CNPJ",
  endereco: "Logradouro",
  numero: "Número",
  bairro: "Bairro",
  cep: "CEP",
  cidade: "Município",
  estado: "UF",
  codigo_ibge: "Município",
  situacao_icms: "Situação perante o ICMS",
  inscricao_estadual: "Inscrição Estadual",
};

export function mensagemDestinatarioIncompleto(data) {
  if (data?.code !== "NFE_DESTINATARIO_INCOMPLETO") return null;
  const vistos = new Set();
  const linhas = [];
  for (const item of Array.isArray(data.campos) ? data.campos : []) {
    const rotulo = ROTULO_CAMPO_DEST[item?.campo] || item?.campo;
    if (!rotulo || vistos.has(rotulo)) continue;
    vistos.add(rotulo);
    linhas.push(`• ${rotulo}`);
  }
  const lista = linhas.length ? `\n\n${linhas.join("\n")}` : "";
  return `Não foi possível emitir a NF-e.\n\nO cadastro do cliente está incompleto:${lista}\n\nEdite o cadastro do cliente e tente novamente.`;
}

export function mensagemOperacaoFiscalIncompleta(data) {
  if (data?.code === "NFE_OPERACAO_FISCAL_INCOMPLETA") {
    return "Não foi possível emitir a NF-e.\n\nInforme se esta operação é destinada a consumidor final.\n\nEdite a OS e escolha Sim ou Não.";
  }
  if (data?.code === "NFE_ICMS_UF_DESTINO_NAO_CONFIGURADO") {
    return data.message || data.error;
  }
  return null;
}

export function mensagemConfigFiscalIncompleta(data) {
  if (data?.code !== "NFE_CONFIGURACAO_FISCAL_INCOMPLETA") return null;
  const linhas = (Array.isArray(data.campos) ? data.campos : [])
    .map((item) => item?.motivo)
    .filter(Boolean);
  const detalhe = linhas.length ? linhas.map((l) => `• ${l}`).join("\n") : "• Regime tributário ou situação de ICMS";
  return `Não foi possível emitir a NF-e.\n\nA configuração fiscal da empresa está incompleta:\n\n${detalhe}\n\nConfiguração fiscal → informe o regime e a situação tributária e tente novamente.`;
}

export function feedbackNotaFiscal(toast, message, nf) {
  const st = nf?.status_nf;
  const quem = rotuloNota(nf);
  if (st === "autorizada") {
    toast.success(message || `Nota fiscal autorizada na ${quem}.`);
  } else if (st === "configuracao_pendente") {
    toast.error(
      message || `Provedor fiscal não configurado neste servidor (${quem}).`,
      { duration: 8000 },
    );
  } else if (st === "erro_autenticacao" || st === "rejeitada") {
    toast.error(message || `Falha na nota fiscal na ${quem}.`);
  } else if (st === "processamento") {
    toast(message || "Nota em processamento. Aguarde ou atualize o status.", {
      icon: "⏳",
      duration: 6000,
    });
  } else {
    toast(message || "Registro de NF atualizado.", { duration: 5000 });
  }
}
