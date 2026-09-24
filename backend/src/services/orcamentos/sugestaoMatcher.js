const STOP = new Set([
  "de", "da", "do", "das", "dos", "para", "com", "sem", "uma", "uns",
  "por", "que", "nao", "não", "em", "no", "na", "os", "as", "um", "ou",
]);

export function normalizarTexto(valor) {
  let texto = String(valor || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  texto = texto.replace(/([a-z0-9])[-/]([a-z0-9])/g, "$1$2");
  texto = texto.replace(/[^a-z0-9.]+/g, " ");
  texto = texto.replace(/(^|\s)\.(?=\s|$)/g, " ");
  texto = texto.replace(/(?<!\d)\.(?!\d)/g, " ");
  return texto.trim().replace(/\s+/g, " ");
}

function tokensRelevantes(texto) {
  return normalizarTexto(texto)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

function textoCadastro(row) {
  return normalizarTexto(
    [row?.nome, row?.codigo, row?.descricao].filter(Boolean).join(" "),
  );
}

function tokensTecnicos(texto) {
  return normalizarTexto(texto)
    .split(" ")
    .filter((t) => t.length >= 2 && /\d/.test(t));
}

function trigramas(texto) {
  const s = `  ${normalizarTexto(texto)}  `;
  const set = new Set();
  for (let i = 0; i < s.length - 2; i += 1) set.add(s.slice(i, i + 3));
  return set;
}

export function similaridadeTrigrama(a, b) {
  const ta = trigramas(a);
  const tb = trigramas(b);
  if (!ta.size || !tb.size) return 0;
  let iguais = 0;
  for (const g of ta) if (tb.has(g)) iguais += 1;
  return (2 * iguais) / (ta.size + tb.size);
}

function conflitoTecnico(sugestao, cadastro) {
  const a = tokensTecnicos(sugestao);
  const b = tokensTecnicos(cadastro);
  if (!a.length || !b.length) return false;
  return !a.some((t) => b.includes(t));
}

/**
 * MATCH_EXATO: código ou nome normalizado igual.
 * MATCH_PROVAVEL: tokens principais, sinônimo ou similaridade, sem conflito técnico.
 * Retorna null quando o candidato é fraco ou contradiz uma especificação (5W30 x 10W40).
 */
export function classificarContraCadastro(termos, row, veiculo = null) {
  const rank = pontuarCadastro(termos, row, veiculo);
  return rank?.nivel || null;
}

export function pontuarCadastro(termos, row, veiculo = null) {
  const alvo = textoCadastro(row);
  const nome = normalizarTexto(row?.nome);
  const codigo = normalizarTexto(row?.codigo);
  if (!alvo) return null;
  const sugestao = [...new Set((termos || []).map((t) => normalizarTexto(t)).filter(Boolean))].join(" ");
  if (!sugestao) return null;
  if (conflitoTecnico(sugestao, alvo)) return null;

  if (codigo && (termos || []).some((t) => normalizarTexto(t) === codigo)) {
    return { pontos: 100, nivel: "MATCH_EXATO", razao: "código igual" };
  }
  if (nome && (termos || []).some((t) => normalizarTexto(t) === nome)) {
    return { pontos: 90, nivel: "MATCH_EXATO", razao: "nome igual" };
  }

  let pontos = 0;
  let razao = "";
  const tokens = tokensRelevantes(sugestao);
  if (tokens.length && tokens.every((t) => alvo.includes(t))) {
    pontos += 40;
    razao = "tokens principais presentes";
  } else {
    const tecnicos = tokensTecnicos(sugestao);
    if (tecnicos.length && tecnicos.every((t) => alvo.includes(t))) {
      pontos += 28;
      razao = "especificação presente no cadastro";
    }
  }

  const sim = similaridadeTrigrama(sugestao, nome || alvo);
  if (sim >= 0.45) {
    pontos += Math.round(sim * 20);
    razao = razao || "nome semelhante";
  }

  for (const bruto of termos || []) {
    const termo = normalizarTexto(bruto);
    if (termo.length >= 4 && alvo.includes(termo)) {
      pontos = Math.max(pontos, 32);
      razao = razao || "termo presente no cadastro";
    }
  }

  const contexto = [veiculo?.marca, veiculo?.modelo, veiculo?.versao, veiculo?.motor, veiculo?.combustivel]
    .map((v) => normalizarTexto(v))
    .filter((v) => v.length >= 2);
  let bonusVeiculo = 0;
  for (const parte of contexto) {
    if (alvo.includes(parte)) bonusVeiculo += 4;
  }
  if (bonusVeiculo) {
    pontos += bonusVeiculo;
    razao = razao || "correspondência textual com o veículo";
  }

  if (pontos < 28) return null;
  return { pontos, nivel: "MATCH_PROVAVEL", razao: razao || "nome semelhante" };
}

function termosDaSugestao(item) {
  const lista = [item?.descricao, ...(item?.termos_busca || [])];
  return [...new Set(lista.map((t) => String(t || "").trim()).filter(Boolean))].slice(0, 8);
}

const MARGEM_AMBIGUA = 8;
const LIMITE_CANDIDATOS_MATCH = 3;

function escolherMelhor(termos, rows, veiculo = null) {
  const ranqueados = (rows || [])
    .map((row) => {
      const rank = pontuarCadastro(termos, row, veiculo);
      return rank ? { row, ...rank } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, LIMITE_CANDIDATOS_MATCH);
  if (!ranqueados.length) return null;
  const top = ranqueados[0];
  const segundo = ranqueados[1];
  const ambiguo = Boolean(segundo && top.nivel !== "MATCH_EXATO" && top.pontos - segundo.pontos <= MARGEM_AMBIGUA);
  return {
    match: top.nivel,
    row: ambiguo ? null : top.row,
    ambiguo,
    candidatos: ranqueados,
  };
}

function produtoDe(row) {
  return {
    id: row.id,
    codigo: row.codigo || "",
    nome: row.nome || "",
    valor_unitario: Number(row.valor_venda) || 0,
    estoque: Number(row.quantidade) || 0,
  };
}

function candidatosProduto(achado) {
  return (achado?.candidatos || []).map((c) => ({
    razao: c.razao,
    produto: produtoDe(c.row),
    estoque_status: estadoEstoque(c.row.quantidade, 1),
  }));
}

export function estadoEstoque(estoque, quantidade) {
  const saldo = Number(estoque);
  const qtd = Number(quantidade);
  const disponivel = Number.isFinite(saldo) ? saldo : 0;
  const pedido = Number.isFinite(qtd) && qtd > 0 ? qtd : 1;
  if (disponivel <= 0) return "SEM_ESTOQUE";
  if (disponivel < pedido) return "ESTOQUE_INSUFICIENTE";
  return "DISPONIVEL";
}

function quantidadeDe(item, campo) {
  const n = Number(item?.[campo] ?? item?.quantidade_sugerida ?? item?.quantidade ?? 1);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(999, n);
}

export function casarPecas(pecas, produtos, veiculo = null) {
  return (pecas || []).map((item) => {
    const termos = termosDaSugestao(item);
    const qtd = quantidadeDe(item, "quantidade");
    const achado = escolherMelhor(termos, produtos, veiculo);
    const base = {
      tipo: "produto",
      descricao: item.descricao,
      termos_busca: item.termos_busca || [],
      necessidade: item.necessidade || "possivel",
      confianca: item.confianca || "media",
      quantidade_sugerida: qtd,
    };
    if (!achado) return { ...base, match: "NAO_ENCONTRADO" };
    const candidatos = candidatosProduto(achado);
    if (achado.ambiguo) {
      return { ...base, match: "MATCH_PROVAVEL", ambiguo: true, candidatos };
    }
    const estoque = Number(achado.row.quantidade) || 0;
    return {
      ...base,
      match: achado.match,
      estoque_status: estadoEstoque(estoque, qtd),
      produto: produtoDe(achado.row),
      candidatos,
    };
  });
}

export function casarServicos(servicos, catalogo, veiculo = null) {
  return (servicos || []).map((item) => {
    const termos = termosDaSugestao(item);
    const qtd = quantidadeDe(item, "quantidade_sugerida");
    const achado = escolherMelhor(termos, catalogo, veiculo);
    const base = {
      tipo: "servico",
      descricao: item.descricao,
      termos_busca: item.termos_busca || [],
      confianca: item.confianca || "media",
      quantidade_sugerida: qtd,
    };
    if (!achado) return { ...base, match: "NAO_ENCONTRADO" };
    const candidatos = (achado.candidatos || []).map((c) => ({
      razao: c.razao,
      servico: {
        codigo: c.row.codigo || "",
        nome: c.row.nome || "",
        descricao: c.row.descricao || c.row.nome || "",
        valor_unitario: Number(c.row.valor_unitario) || 0,
      },
    }));
    if (achado.ambiguo) return { ...base, match: "MATCH_PROVAVEL", ambiguo: true, candidatos };
    return {
      ...base,
      match: achado.match,
      servico: {
        codigo: achado.row.codigo || "",
        nome: achado.row.nome || "",
        descricao: achado.row.descricao || achado.row.nome || "",
        valor_unitario: Number(achado.row.valor_unitario) || 0,
      },
      candidatos,
    };
  });
}

export function casarCondicionais(itens, produtos, veiculo = null) {
  return (itens || []).map((item) => {
    const termos = termosDaSugestao(item);
    const achado = escolherMelhor(termos, produtos, veiculo);
    const base = {
      tipo: "condicional",
      descricao: item.descricao,
      termos_busca: item.termos_busca || [],
      motivo: item.motivo || "",
      quantidade_sugerida: 1,
    };
    if (!achado) return { ...base, match: "NAO_ENCONTRADO" };
    const candidatos = candidatosProduto(achado);
    if (achado.ambiguo) return { ...base, match: "MATCH_PROVAVEL", ambiguo: true, candidatos };
    return {
      ...base,
      match: achado.match,
      estoque_status: estadoEstoque(achado.row.quantidade, 1),
      produto: produtoDe(achado.row),
      candidatos,
    };
  });
}
