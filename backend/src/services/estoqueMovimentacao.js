import { badRequest } from "../lib/AppError.js";

/**
 * Baixa estoque com escopo de tenant e bloqueio de saldo negativo.
 */
export async function baixarEstoqueProduto(
  client,
  { tenantId, produtoId, quantidade, motivo, osId = null, orcamentoId = null },
) {
  // Bloqueia a linha do produto no tenant para evitar baixa concorrente inconsistente
  await client.query(
    "SELECT id FROM produtos WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
    [produtoId, tenantId],
  );

  const updated = await client.query(
    `UPDATE produtos
     SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP
     WHERE id = $2 AND tenant_id = $3 AND quantidade >= $1
     RETURNING id`,
    [quantidade, produtoId, tenantId],
  );
  if (updated.rows.length === 0) {
    const exists = await client.query(
      "SELECT id, quantidade FROM produtos WHERE id = $1 AND tenant_id = $2",
      [produtoId, tenantId],
    );
    if (!exists.rows[0]) {
      throw badRequest(`Produto ${produtoId} não encontrado neste tenant`);
    }
    throw badRequest(
      `Estoque insuficiente para o produto ${produtoId} (disponível: ${exists.rows[0].quantidade}, solicitado: ${quantidade})`,
    );
  }
  await client.query(
    `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id, orcamento_id)
     VALUES ($1,'SAIDA',$2,$3,$4,$5)`,
    [produtoId, quantidade, motivo, osId, orcamentoId],
  );
}
