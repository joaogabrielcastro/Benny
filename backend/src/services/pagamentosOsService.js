import pool from "../../database.js";
import { badRequest, notFound } from "../lib/AppError.js";
import { registrarAuditoria } from "../utils/auditoria.js";

/** Tolerância de arredondamento para comparar somas monetárias. */
const EPS = 0.009;

export const FORMAS_PAGAMENTO = Object.freeze([
  "Dinheiro",
  "PIX",
  "Cartão de débito",
  "Cartão de crédito",
  "Boleto",
  "Transferência",
  "Outro",
]);

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

/**
 * Resumo financeiro de uma OS a partir das linhas de pagamento.
 * Pure — usado pelo service e pelos testes.
 */
export function resumoPagamentos(valorTotal, pagamentos = []) {
  const total = round2(valorTotal);
  const recebido = round2(
    pagamentos
      .filter((p) => p.status === "Recebido")
      .reduce((s, p) => s + Number(p.valor || 0), 0),
  );
  const pendente = round2(
    pagamentos
      .filter((p) => p.status === "Pendente")
      .reduce((s, p) => s + Number(p.valor || 0), 0),
  );
  const saldo = round2(total - recebido);
  let situacao = "Em aberto";
  if (total > 0 && saldo <= EPS) situacao = "Quitada";
  else if (recebido > EPS) situacao = "Parcial";
  return {
    valor_total: total,
    valor_recebido: recebido,
    valor_pendente: pendente,
    saldo,
    nao_programado: round2(Math.max(0, total - recebido - pendente)),
    situacao,
  };
}

/** Garante que recebido + pendente não ultrapasse o total da OS. */
export function assertNaoExcedeTotal(valorTotal, pagamentos, novoValor = 0) {
  const soma = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0) + Number(novoValor || 0);
  if (soma - Number(valorTotal || 0) > EPS) {
    throw badRequest(
      `A soma dos pagamentos (${round2(soma).toFixed(2)}) ultrapassa o total da OS (${round2(valorTotal).toFixed(2)}).`,
    );
  }
}

async function carregarOs(client, tenantId, osId, lock = false) {
  const r = await client.query(
    `SELECT id, numero, status, valor_total FROM ordens_servico
     WHERE id = $1 AND tenant_id = $2 ${lock ? "FOR UPDATE" : ""}`,
    [osId, tenantId],
  );
  if (!r.rows[0]) throw notFound("OS não encontrada");
  return r.rows[0];
}

async function listarLinhas(client, tenantId, osId) {
  const r = await client.query(
    `SELECT * FROM os_pagamentos WHERE os_id = $1 AND tenant_id = $2
     ORDER BY COALESCE(data_pagamento, data_vencimento) NULLS LAST, id`,
    [osId, tenantId],
  );
  return r.rows;
}

export async function listarPorOs(tenantId, osId) {
  const os = await carregarOs(pool, tenantId, osId);
  const pagamentos = await listarLinhas(pool, tenantId, osId);
  return {
    pagamentos,
    resumo: resumoPagamentos(os.valor_total, pagamentos),
  };
}

function normalizarEntrada(dados) {
  const status = dados.status === "Pendente" ? "Pendente" : "Recebido";
  const hoje = new Date().toISOString().slice(0, 10);
  return {
    valor: round2(dados.valor),
    forma_pagamento: dados.forma_pagamento,
    status,
    data_pagamento: status === "Recebido" ? dados.data_pagamento || hoje : null,
    data_vencimento:
      status === "Pendente" ? dados.data_vencimento || hoje : dados.data_vencimento || null,
    observacoes: dados.observacoes || null,
  };
}

export async function registrar(tenantId, osId, dados, usuarioId = null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const os = await carregarOs(client, tenantId, osId, true);
    if (os.status === "Cancelada") {
      throw badRequest("Não é possível registrar pagamento em OS cancelada.");
    }
    const linhas = await listarLinhas(client, tenantId, osId);
    const entrada = normalizarEntrada(dados);
    assertNaoExcedeTotal(os.valor_total, linhas, entrada.valor);

    const r = await client.query(
      `INSERT INTO os_pagamentos
         (tenant_id, os_id, valor, forma_pagamento, status, data_vencimento, data_pagamento, observacoes, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        tenantId,
        osId,
        entrada.valor,
        entrada.forma_pagamento,
        entrada.status,
        entrada.data_vencimento,
        entrada.data_pagamento,
        entrada.observacoes,
        usuarioId,
      ],
    );
    await registrarAuditoria("os_pagamentos", r.rows[0].id, "INSERT", null, r.rows[0], "sistema", client);
    await client.query("COMMIT");
    return r.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function atualizar(tenantId, osId, pagamentoId, dados) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const os = await carregarOs(client, tenantId, osId, true);
    const linhas = await listarLinhas(client, tenantId, osId);
    const atual = linhas.find((l) => l.id === Number(pagamentoId));
    if (!atual) throw notFound("Pagamento não encontrado");

    const mesclado = normalizarEntrada({
      valor: dados.valor ?? atual.valor,
      forma_pagamento: dados.forma_pagamento ?? atual.forma_pagamento,
      status: dados.status ?? atual.status,
      data_pagamento:
        dados.data_pagamento !== undefined ? dados.data_pagamento : atual.data_pagamento,
      data_vencimento:
        dados.data_vencimento !== undefined ? dados.data_vencimento : atual.data_vencimento,
      observacoes: dados.observacoes !== undefined ? dados.observacoes : atual.observacoes,
    });
    if (mesclado.data_pagamento instanceof Date) {
      mesclado.data_pagamento = mesclado.data_pagamento.toISOString().slice(0, 10);
    }
    assertNaoExcedeTotal(
      os.valor_total,
      linhas.filter((l) => l.id !== atual.id),
      mesclado.valor,
    );

    const r = await client.query(
      `UPDATE os_pagamentos
       SET valor=$1, forma_pagamento=$2, status=$3, data_vencimento=$4, data_pagamento=$5,
           observacoes=$6, atualizado_em=CURRENT_TIMESTAMP
       WHERE id=$7 AND tenant_id=$8 RETURNING *`,
      [
        mesclado.valor,
        mesclado.forma_pagamento,
        mesclado.status,
        mesclado.data_vencimento,
        mesclado.data_pagamento,
        mesclado.observacoes,
        atual.id,
        tenantId,
      ],
    );
    await registrarAuditoria("os_pagamentos", atual.id, "UPDATE", atual, r.rows[0], "sistema", client);
    await client.query("COMMIT");
    return r.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function remover(tenantId, osId, pagamentoId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      "DELETE FROM os_pagamentos WHERE id=$1 AND os_id=$2 AND tenant_id=$3 RETURNING *",
      [pagamentoId, osId, tenantId],
    );
    if (!r.rows[0]) throw notFound("Pagamento não encontrado");
    await registrarAuditoria("os_pagamentos", r.rows[0].id, "DELETE", r.rows[0], null, "sistema", client);
    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Contas a receber: parcelas pendentes (e recebidas, se pedido) com OS e cliente. */
export async function listarReceber(
  tenantId,
  { status, data_inicio, data_fim, busca, limit = 20, offset = 0 } = {},
) {
  const params = [tenantId];
  let where = "WHERE p.tenant_id = $1";
  const hoje = new Date().toISOString().slice(0, 10);
  if (status === "Vencido") {
    params.push(hoje);
    where += ` AND p.status = 'Pendente' AND p.data_vencimento < $${params.length}`;
  } else if (status === "Pendente" || status === "Recebido") {
    params.push(status);
    where += ` AND p.status = $${params.length}`;
  }
  const dataCol = "COALESCE(p.data_pagamento, p.data_vencimento)";
  if (data_inicio) {
    params.push(data_inicio);
    where += ` AND ${dataCol} >= $${params.length}::date`;
  }
  if (data_fim) {
    params.push(data_fim);
    where += ` AND ${dataCol} <= $${params.length}::date`;
  }
  if (busca) {
    params.push(`%${busca}%`);
    where += ` AND (os.numero ILIKE $${params.length} OR c.nome ILIKE $${params.length})`;
  }
  const from = `FROM os_pagamentos p
    JOIN ordens_servico os ON os.id = p.os_id AND os.tenant_id = p.tenant_id
    LEFT JOIN clientes c ON c.id = os.cliente_id`;

  const [count, data] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total ${from} ${where}`, params),
    pool.query(
      `SELECT p.*, os.numero AS os_numero, os.status AS os_status, c.nome AS cliente_nome
       ${from} ${where}
       ORDER BY ${dataCol} DESC NULLS LAST, p.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
  ]);
  return { rows: data.rows, total: count.rows[0]?.total ?? 0 };
}

/**
 * Resumo financeiro do período: entradas (recebimentos), saídas (contas pagas),
 * a receber e a pagar em aberto, e série diária do fluxo de caixa.
 */
export async function resumoFinanceiro(tenantId, { data_inicio, data_fim }) {
  const hoje = new Date();
  const inicio =
    data_inicio ||
    new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fim = data_fim || hoje.toISOString().slice(0, 10);

  const [entradas, saidas, aReceber, aPagar, osSemPagamento, serieEntradas, serieSaidas, porForma] =
    await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(valor),0) AS total FROM os_pagamentos
         WHERE tenant_id=$1 AND status='Recebido' AND data_pagamento BETWEEN $2 AND $3`,
        [tenantId, inicio, fim],
      ),
      pool.query(
        `SELECT COALESCE(SUM(valor),0) AS total FROM contas_pagar
         WHERE tenant_id=$1 AND status='Pago' AND data_pagamento BETWEEN $2 AND $3`,
        [tenantId, inicio, fim],
      ),
      pool.query(
        `SELECT COALESCE(SUM(valor),0) AS total, COUNT(*)::int AS quantidade,
                COALESCE(SUM(valor) FILTER (WHERE data_vencimento < CURRENT_DATE),0) AS vencido
         FROM os_pagamentos WHERE tenant_id=$1 AND status='Pendente'`,
        [tenantId],
      ),
      pool.query(
        `SELECT COALESCE(SUM(valor),0) AS total, COUNT(*)::int AS quantidade,
                COALESCE(SUM(valor) FILTER (WHERE data_vencimento < CURRENT_DATE),0) AS vencido
         FROM contas_pagar WHERE tenant_id=$1 AND status='Pendente'`,
        [tenantId],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS quantidade,
                COALESCE(SUM(os.valor_total - COALESCE(pg.soma,0)),0) AS valor
         FROM ordens_servico os
         LEFT JOIN (
           SELECT os_id, SUM(valor) AS soma FROM os_pagamentos WHERE tenant_id=$1 GROUP BY os_id
         ) pg ON pg.os_id = os.id
         WHERE os.tenant_id=$1 AND os.status='Finalizada'
           AND os.valor_total - COALESCE(pg.soma,0) > 0.009`,
        [tenantId],
      ),
      pool.query(
        `SELECT to_char(data_pagamento,'YYYY-MM-DD') AS dia, SUM(valor) AS total FROM os_pagamentos
         WHERE tenant_id=$1 AND status='Recebido' AND data_pagamento BETWEEN $2 AND $3
         GROUP BY 1 ORDER BY 1`,
        [tenantId, inicio, fim],
      ),
      pool.query(
        `SELECT to_char(data_pagamento,'YYYY-MM-DD') AS dia, SUM(valor) AS total FROM contas_pagar
         WHERE tenant_id=$1 AND status='Pago' AND data_pagamento BETWEEN $2 AND $3
         GROUP BY 1 ORDER BY 1`,
        [tenantId, inicio, fim],
      ),
      pool.query(
        `SELECT forma_pagamento, SUM(valor) AS total FROM os_pagamentos
         WHERE tenant_id=$1 AND status='Recebido' AND data_pagamento BETWEEN $2 AND $3
         GROUP BY 1 ORDER BY 2 DESC`,
        [tenantId, inicio, fim],
      ),
    ]);

  const dias = new Map();
  const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
  for (const r of serieEntradas.rows) {
    dias.set(iso(r.dia), { dia: iso(r.dia), entradas: Number(r.total), saidas: 0 });
  }
  for (const r of serieSaidas.rows) {
    const k = iso(r.dia);
    const cur = dias.get(k) || { dia: k, entradas: 0, saidas: 0 };
    cur.saidas = Number(r.total);
    dias.set(k, cur);
  }
  const serie = [...dias.values()].sort((a, b) => a.dia.localeCompare(b.dia));

  const totalEntradas = Number(entradas.rows[0].total);
  const totalSaidas = Number(saidas.rows[0].total);
  return {
    periodo: { data_inicio: inicio, data_fim: fim },
    entradas: totalEntradas,
    saidas: totalSaidas,
    saldo: round2(totalEntradas - totalSaidas),
    a_receber: {
      total: Number(aReceber.rows[0].total),
      quantidade: aReceber.rows[0].quantidade,
      vencido: Number(aReceber.rows[0].vencido),
    },
    a_pagar: {
      total: Number(aPagar.rows[0].total),
      quantidade: aPagar.rows[0].quantidade,
      vencido: Number(aPagar.rows[0].vencido),
    },
    os_finalizadas_sem_quitacao: {
      quantidade: osSemPagamento.rows[0].quantidade,
      valor: Number(osSemPagamento.rows[0].valor),
    },
    por_forma: porForma.rows.map((r) => ({
      forma_pagamento: r.forma_pagamento,
      total: Number(r.total),
    })),
    serie,
  };
}

export default {
  listarPorOs,
  registrar,
  atualizar,
  remover,
  listarReceber,
  resumoFinanceiro,
};
