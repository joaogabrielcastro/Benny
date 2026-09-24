/**
 * Histórico mecânico das OS do mesmo veículo e tenant.
 * Somente leitura. Não conhece IA.
 *
 * Só OS Finalizada: serviço concluído.
 * Aberta, Em andamento e Cancelada não entram neste contexto.
 * Não existe status "excluída".
 */

export const LIMITE_OS = 5;
export const LIMITE_ITENS_POR_OS = 8;
export const LIMITE_OBS = 240;
export const LIMITE_HISTORICO_CHARS = 4000;

export const STATUS_HISTORICO_VALIDOS = Object.freeze(["Finalizada"]);

function dataIso(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function cortar(texto, max) {
  const s = String(texto || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return s.slice(0, max).trim();
}

function agruparItens(rows, limite) {
  const map = new Map();
  for (const row of rows || []) {
    const lista = map.get(row.os_id) || [];
    if (lista.length < limite) {
      lista.push({
        descricao: cortar(row.descricao, 160),
        quantidade: Number(row.quantidade) || 0,
      });
    }
    map.set(row.os_id, lista);
  }
  return map;
}

export async function buscarHistoricoVeiculo(
  query,
  { tenantId, veiculoId, limite = LIMITE_OS } = {},
) {
  const teto = Math.min(Math.max(Number(limite) || LIMITE_OS, 1), LIMITE_OS);
  const os = await query(
    `SELECT id, numero, criado_em, km, observacoes_veiculo, observacoes_gerais
     FROM ordens_servico
     WHERE tenant_id = $1
       AND veiculo_id = $2
       AND status = ANY($3::text[])
     ORDER BY criado_em DESC, id DESC
     LIMIT $4`,
    [tenantId, veiculoId, STATUS_HISTORICO_VALIDOS, teto],
  );

  const ids = os.rows.map((row) => row.id);
  if (!ids.length) return [];

  const [produtos, servicos] = await Promise.all([
    query(
      `SELECT op.os_id, op.descricao, op.quantidade
       FROM os_produtos op
       INNER JOIN ordens_servico os ON os.id = op.os_id
       WHERE os.tenant_id = $1
         AND os.veiculo_id = $2
         AND op.os_id = ANY($3::int[])
       ORDER BY op.id`,
      [tenantId, veiculoId, ids],
    ),
    query(
      `SELECT sv.os_id, sv.descricao, sv.quantidade
       FROM os_servicos sv
       INNER JOIN ordens_servico os ON os.id = sv.os_id
       WHERE os.tenant_id = $1
         AND os.veiculo_id = $2
         AND sv.os_id = ANY($3::int[])
       ORDER BY sv.id`,
      [tenantId, veiculoId, ids],
    ),
  ]);

  const porProduto = agruparItens(produtos.rows, LIMITE_ITENS_POR_OS);
  const porServico = agruparItens(servicos.rows, LIMITE_ITENS_POR_OS);

  return os.rows.map((row) => ({
    data: dataIso(row.criado_em),
    km: row.km == null ? null : Number(row.km),
    numero: row.numero || "",
    observacoes_veiculo: cortar(row.observacoes_veiculo, LIMITE_OBS),
    observacoes_gerais: cortar(row.observacoes_gerais, LIMITE_OBS),
    produtos: porProduto.get(row.id) || [],
    servicos: porServico.get(row.id) || [],
  }));
}

/** Remove OS mais antigas até o JSON caber no teto. Não corta no meio de um objeto. */
export function prepararHistoricoParaIa(historico, maxChars = LIMITE_HISTORICO_CHARS) {
  const lista = Array.isArray(historico) ? [...historico] : [];
  while (lista.length > 1 && JSON.stringify(lista).length > maxChars) {
    lista.pop();
  }
  if (lista.length === 1 && JSON.stringify(lista).length > maxChars) {
    const unica = {
      ...lista[0],
      observacoes_veiculo: "",
      observacoes_gerais: "",
      produtos: (lista[0].produtos || []).slice(0, 3),
      servicos: (lista[0].servicos || []).slice(0, 3),
    };
    return [unica];
  }
  return lista;
}

export function resumirHistoricoParaUi(historico) {
  return (historico || []).map((os) => ({
    data: os.data,
    km: os.km,
    itens: [...(os.servicos || []), ...(os.produtos || [])]
      .map((item) => item.descricao)
      .filter(Boolean)
      .slice(0, 4),
  }));
}
