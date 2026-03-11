import pool from "../../database.js";

const dashboard = async (tenantId) => {
  const [
    faturamentoMes,
    ticketMedio,
    faturamentoMensal,
    produtosMaisVendidos,
    osAbertas,
    orcamentosAtivos,
  ] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(valor_total), 0) as faturamento
       FROM ordens_servico
       WHERE status = 'Finalizada' AND tenant_id = $1
         AND DATE_TRUNC('month', criado_em) = DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId],
    ),
    pool.query(
      `SELECT COALESCE(AVG(valor_total), 0) as ticket_medio
       FROM ordens_servico
       WHERE status = 'Finalizada' AND tenant_id = $1
         AND DATE_TRUNC('month', criado_em) = DATE_TRUNC('month', CURRENT_DATE)`,
      [tenantId],
    ),
    pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', criado_em), 'Mon/YY') as mes,
         COALESCE(SUM(valor_total), 0) as valor
       FROM ordens_servico
       WHERE status = 'Finalizada' AND tenant_id = $1
         AND criado_em >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', criado_em)
       ORDER BY DATE_TRUNC('month', criado_em)`,
      [tenantId],
    ),
    pool.query(
      `SELECT p.nome, COALESCE(SUM(op.quantidade), 0) as quantidade
       FROM produtos p
       LEFT JOIN os_produtos op ON p.id = op.produto_id
       LEFT JOIN ordens_servico os ON op.os_id = os.id
       WHERE os.status = 'Finalizada' AND os.tenant_id = $1
         AND os.criado_em >= CURRENT_DATE - INTERVAL '3 months'
       GROUP BY p.id, p.nome
       HAVING SUM(op.quantidade) > 0
       ORDER BY quantidade DESC
       LIMIT 10`,
      [tenantId],
    ),
    pool.query(
      `SELECT COUNT(*) as total FROM ordens_servico WHERE status = 'Aberta' AND tenant_id = $1`,
      [tenantId],
    ),
    pool.query(
      `SELECT COUNT(*) as total FROM orcamentos WHERE status = 'Pendente' AND tenant_id = $1`,
      [tenantId],
    ),
  ]);

  return {
    faturamentoMes: parseFloat(faturamentoMes.rows[0]?.faturamento || 0),
    ticketMedio: parseFloat(ticketMedio.rows[0]?.ticket_medio || 0),
    faturamentoMensal: faturamentoMensal.rows.map((r) => ({
      mes: r.mes,
      valor: parseFloat(r.valor),
    })),
    produtosMaisVendidos: produtosMaisVendidos.rows.map((r) => ({
      nome: r.nome,
      quantidade: parseInt(r.quantidade),
    })),
    osAbertas: parseInt(osAbertas.rows[0]?.total || 0),
    orcamentosAtivos: parseInt(orcamentosAtivos.rows[0]?.total || 0),
  };
};

const vendas = async (tenantId, dataInicio, dataFim) => {
  let query = `
    SELECT os.id, os.numero, os.criado_em, os.valor_total, os.status,
           c.nome as cliente_nome,
           v.modelo as veiculo_modelo, v.placa as veiculo_placa
    FROM ordens_servico os
    LEFT JOIN clientes c ON os.cliente_id = c.id
    LEFT JOIN veiculos v ON os.veiculo_id = v.id
    WHERE os.status = 'Finalizada' AND os.tenant_id = $1
  `;
  const params = [tenantId];

  if (dataInicio && dataFim) {
    query += ` AND os.criado_em BETWEEN $2 AND $3`;
    params.push(dataInicio, dataFim);
  }

  query += ` ORDER BY os.criado_em DESC`;

  const result = await pool.query(query, params);
  const total = result.rows.reduce(
    (sum, os) => sum + parseFloat(os.valor_total),
    0,
  );

  return { vendas: result.rows, total, quantidade: result.rows.length };
};

export default { dashboard, vendas };
