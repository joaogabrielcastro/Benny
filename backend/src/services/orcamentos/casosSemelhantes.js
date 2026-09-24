import { normalizarTexto } from "./sugestaoMatcher.js";

/**
 * OS finalizadas de OUTROS veículos da mesma oficina, mesma marca e modelo.
 * Contexto aproximado. Não é histórico do veículo atual nem estatística.
 */

export const LIMITE_CASOS = 5;
export const LIMITE_CANDIDATOS_SQL = 20;
export const LIMITE_ITENS = 6;
export const LIMITE_TERMOS = 8;

const ACENTO_DE = "áàâãäéèêëíìîïóòôõöúùûüçñ";
const ACENTO_PARA = "aaaaaeeeeiiiiooooouuuucn";

const EXPANSAO = {
  esquentando: ["aquecendo", "temperatura", "arrefecimento"],
  aquecendo: ["esquentando", "temperatura", "arrefecimento"],
  agua: ["liquido", "vazamento", "arrefecimento"],
  baixando: ["perda", "vazamento"],
  vazamento: ["agua", "liquido"],
  radiador: ["arrefecimento"],
  temperatura: ["esquentando", "aquecendo"],
  liquido: ["agua", "arrefecimento"],
};

export function termosDaDescricao(descricao) {
  const base = normalizarTexto(descricao)
    .split(" ")
    .filter((t) => t.length >= 4);
  const termos = [];
  for (const termo of base) {
    termos.push(termo, ...(EXPANSAO[termo] || []));
  }
  return [...new Set(termos.map((t) => normalizarTexto(t)).filter((t) => t.length >= 4))].slice(
    0,
    LIMITE_TERMOS,
  );
}

/** Ranking interno. Não vira porcentagem. Motor diferente conhecido é excluído. */
export function avaliarIdentidade(atual = {}, caso = {}) {
  const motorAtual = normalizarTexto(atual.motor);
  const motorCaso = normalizarTexto(caso.motor);
  if (motorAtual && motorCaso && motorAtual !== motorCaso) return null;

  let pontos = 0;
  if (motorAtual && motorCaso && motorAtual === motorCaso) pontos += 8;

  const combAtual = normalizarTexto(atual.combustivel);
  const combCaso = normalizarTexto(caso.combustivel);
  if (combAtual && combCaso && combAtual === combCaso) pontos += 3;
  else if (combAtual && combCaso && combAtual !== combCaso) pontos -= 4;

  const versaoAtual = normalizarTexto(atual.versao);
  const versaoCaso = normalizarTexto(caso.versao);
  if (versaoAtual && versaoCaso && versaoAtual === versaoCaso) pontos += 3;

  const anoAtual = Number(String(atual.ano || "").replace(/\D/g, "").slice(0, 4));
  const anoCaso = Number(String(caso.ano || "").replace(/\D/g, "").slice(0, 4));
  if (anoAtual && anoCaso && Math.abs(anoAtual - anoCaso) <= 2) pontos += 1;

  return { pontos };
}

export function pontuarCaso(caso, termos, atual = {}) {
  let pontos = 0;
  let texto = 0;
  const obs = normalizarTexto(
    `${caso.observacoes_veiculo || ""} ${caso.observacoes_gerais || ""}`,
  );
  const servicos = normalizarTexto((caso.servicos || []).map((s) => s.descricao || s).join(" "));
  const pecas = normalizarTexto((caso.pecas || []).map((p) => p.descricao || p).join(" "));
  if (normalizarTexto(caso.marca)) pontos += 3;
  if (normalizarTexto(caso.modelo)) pontos += 4;
  for (const termo of termos) {
    if (obs.includes(termo)) {
      pontos += 2;
      texto += 2;
    }
    if (servicos.includes(termo)) {
      pontos += 2;
      texto += 2;
    }
    if (pecas.includes(termo)) {
      pontos += 1;
      texto += 1;
    }
  }
  const identidade = avaliarIdentidade(atual, caso);
  if (!identidade) return null;
  return { pontos: pontos + identidade.pontos, texto };
}

function dataIso(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function cortar(texto, max = 180) {
  const s = String(texto || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return s.slice(0, max).trim();
}

function exprSemAcento(coluna) {
  return `translate(lower(coalesce(${coluna}, '')), '${ACENTO_DE}', '${ACENTO_PARA}')`;
}

export async function buscarCasosSemelhantes(
  query,
  { tenantId, veiculoId, marca, modelo, versao, motor, combustivel, ano, descricao, limite = LIMITE_CASOS } = {},
) {
  const marcaNorm = normalizarTexto(marca);
  const modeloNorm = normalizarTexto(modelo);
  const termos = termosDaDescricao(descricao);
  if (!marcaNorm || !modeloNorm || !termos.length) return [];

  const teto = Math.min(Math.max(Number(limite) || LIMITE_CASOS, 1), LIMITE_CASOS);
  const likes = termos.map((t) => `%${t.replace(/[%_\\]/g, "")}%`);
  const obsVeiculo = exprSemAcento("os.observacoes_veiculo");
  const obsGerais = exprSemAcento("os.observacoes_gerais");
  const descServico = exprSemAcento("sv.descricao");
  const descProduto = exprSemAcento("op.descricao");

  const os = await query(
    `SELECT os.id, os.criado_em, os.km,
            os.observacoes_veiculo, os.observacoes_gerais,
            v.marca, v.modelo, v.ano, v.versao, v.motor, v.combustivel
     FROM ordens_servico os
     INNER JOIN veiculos v
       ON v.id = os.veiculo_id AND v.tenant_id = os.tenant_id
     WHERE os.tenant_id = $1
       AND os.veiculo_id <> $2
       AND os.status = 'Finalizada'
       AND lower(trim(v.marca)) = $3
       AND lower(trim(v.modelo)) = $4
       AND (
         ${obsVeiculo} ILIKE ANY($5::text[])
         OR ${obsGerais} ILIKE ANY($5::text[])
         OR EXISTS (
           SELECT 1 FROM os_servicos sv
           WHERE sv.os_id = os.id AND ${descServico} ILIKE ANY($5::text[])
         )
         OR EXISTS (
           SELECT 1 FROM os_produtos op
           WHERE op.os_id = os.id AND ${descProduto} ILIKE ANY($5::text[])
         )
       )
     ORDER BY os.criado_em DESC, os.id DESC
     LIMIT ${LIMITE_CANDIDATOS_SQL}`,
    [tenantId, veiculoId, marcaNorm, modeloNorm, likes],
  );

  const ids = os.rows.map((row) => row.id);
  if (!ids.length) return [];

  const [produtos, servicos] = await Promise.all([
    query(
      `SELECT op.os_id, op.descricao
       FROM os_produtos op
       INNER JOIN ordens_servico os ON os.id = op.os_id
       WHERE os.tenant_id = $1 AND op.os_id = ANY($2::int[])
       ORDER BY op.id`,
      [tenantId, ids],
    ),
    query(
      `SELECT sv.os_id, sv.descricao
       FROM os_servicos sv
       INNER JOIN ordens_servico os ON os.id = sv.os_id
       WHERE os.tenant_id = $1 AND sv.os_id = ANY($2::int[])
       ORDER BY sv.id`,
      [tenantId, ids],
    ),
  ]);

  const pecasPorOs = new Map();
  for (const row of produtos.rows) {
    const lista = pecasPorOs.get(row.os_id) || [];
    if (lista.length < LIMITE_ITENS && row.descricao) lista.push(cortar(row.descricao, 120));
    pecasPorOs.set(row.os_id, lista);
  }
  const servicosPorOs = new Map();
  for (const row of servicos.rows) {
    const lista = servicosPorOs.get(row.os_id) || [];
    if (lista.length < LIMITE_ITENS && row.descricao) lista.push(cortar(row.descricao, 120));
    servicosPorOs.set(row.os_id, lista);
  }

  const ranqueados = os.rows
    .map((row) => {
      const item = {
        marca: row.marca || "",
        modelo: row.modelo || "",
        ano: row.ano != null ? String(row.ano) : "",
        data: dataIso(row.criado_em),
        km: row.km == null ? null : Number(row.km),
        observacao: cortar(
          [row.observacoes_veiculo, row.observacoes_gerais].filter(Boolean).join(" "),
        ),
        servicos: servicosPorOs.get(row.id) || [],
        pecas: pecasPorOs.get(row.id) || [],
        versao: row.versao || "",
        motor: row.motor || "",
        combustivel: row.combustivel || "",
        observacoes_veiculo: row.observacoes_veiculo,
        observacoes_gerais: row.observacoes_gerais,
      };
      const rank = pontuarCaso(item, termos, { marca, modelo, versao, motor, combustivel, ano });
      if (!rank) return null;
      return { item, rank };
    })
    .filter((row) => row && row.rank.texto > 0)
    .sort((a, b) => b.rank.pontos - a.rank.pontos);

  return ranqueados.slice(0, teto).map(({ item }) => ({
    marca: item.marca,
    modelo: item.modelo,
    ano: item.ano,
    versao: item.versao || undefined,
    motor: item.motor || undefined,
    combustivel: item.combustivel || undefined,
    data: item.data,
    km: item.km,
    observacao: item.observacao,
    servicos: item.servicos,
    pecas: item.pecas,
  }));
}

export function casoCombinaTexto(observacao, descricaoAtual) {
  const termos = termosDaDescricao(descricaoAtual);
  const alvo = normalizarTexto(observacao);
  return termos.some((termo) => alvo.includes(termo));
}
