import { normalizarTexto } from "./sugestaoMatcher.js";
import { expandirSinonimos } from "./sinonimosAutomotivos.js";

export const LIMITE_CANDIDATOS = 20;

const STOP = new Set([
  "de", "da", "do", "das", "dos", "para", "com", "sem", "uma", "uns",
  "por", "que", "nao", "esta", "está", "fica", "pelo", "pela", "como",
]);

export function extrairTermosDescricao(descricao) {
  const tokens = normalizarTexto(descricao)
    .split(" ")
    .filter((t) => t.length >= 4 && !STOP.has(t));
  return [...new Set(tokens)].slice(0, 8);
}

function clausulasIlike(termos, startIndex) {
  const partes = [];
  const params = [];
  let i = startIndex;
  for (const termo of termos) {
    const like = `%${String(termo).replace(/[%_\\]/g, "")}%`;
    partes.push(
      `(nome ILIKE $${i} OR codigo ILIKE $${i} OR COALESCE(descricao, '') ILIKE $${i})`,
    );
    params.push(like);
    i += 1;
  }
  return { sql: partes.join(" OR "), params, next: i };
}

async function buscarTabela(query, tabela, colunas, tenantId, termos, limite) {
  if (!termos.length) return [];
  const { sql, params } = clausulasIlike(termos, 2);
  const result = await query(
    `SELECT ${colunas}
     FROM ${tabela}
     WHERE tenant_id = $1 AND (${sql})
     ORDER BY nome
     LIMIT ${limite}`,
    [tenantId, ...params],
  );
  return result.rows;
}

/** Lista curta do tenant para o prompt. Sem preço de custo e sem catálogo inteiro. */
export async function buscarCandidatos(query, tenantId, termos, limite = LIMITE_CANDIDATOS) {
  const unicos = expandirSinonimos(termos, 12).filter((t) => t.length >= 2);
  const [produtos, servicos] = await Promise.all([
    buscarTabela(
      query,
      "produtos",
      "id, codigo, nome, descricao, valor_venda, quantidade",
      tenantId,
      unicos,
      limite,
    ),
    buscarTabela(
      query,
      "servicos",
      "id, codigo, nome, descricao, valor_unitario",
      tenantId,
      unicos,
      limite,
    ),
  ]);
  return { produtos, servicos };
}

export function candidatosParaPrompt(candidatos) {
  return {
    produtos: (candidatos.produtos || []).map((p) => ({
      codigo: p.codigo || "",
      nome: p.nome || "",
    })),
    servicos: (candidatos.servicos || []).map((s) => ({
      codigo: s.codigo || "",
      nome: s.nome || "",
    })),
  };
}
