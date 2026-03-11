import pool from "../../database.js";
import { registrarAuditoria } from "../utils/auditoria.js";

async function gerarNumeroOS() {
  const result = await pool.query(
    "SELECT numero FROM ordens_servico ORDER BY id DESC LIMIT 1",
  );
  if (result.rows.length === 0) return "OS-0001";
  const n = parseInt(result.rows[0].numero.split("-")[1]) + 1;
  return `OS-${n.toString().padStart(4, "0")}`;
}

function calcularTotais(produtos = [], servicos = []) {
  const valor_produtos = produtos.reduce((s, i) => s + i.valor_total, 0);
  const valor_servicos = servicos.reduce((s, i) => s + i.valor_total, 0);
  return {
    valor_produtos,
    valor_servicos,
    valor_total: valor_produtos + valor_servicos,
  };
}

async function deducaoEstoque(client, os_id, produtos = []) {
  for (const p of produtos) {
    if (!p.produto_id) continue;
    await client.query(
      "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
      [p.quantidade, p.produto_id],
    );
    await client.query(
      `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id)
       VALUES ($1,'SAIDA',$2,'Utilizado na OS',$3)`,
      [p.produto_id, p.quantidade, os_id],
    );
  }
}

// ─── Listagem ─────────────────────────────────────────────────────────────────

const listar = async (tenantId, { status, busca } = {}) => {
  let query = `
    SELECT os.*,
           c.nome as cliente_nome, c.telefone as cliente_telefone,
           v.marca as veiculo_marca, v.modelo as veiculo_modelo, v.placa as veiculo_placa,
           v.cor as veiculo_cor, v.ano as veiculo_ano
    FROM ordens_servico os
    LEFT JOIN clientes c ON os.cliente_id = c.id
    LEFT JOIN veiculos v ON os.veiculo_id = v.id
    WHERE os.tenant_id = $1
  `;
  const params = [tenantId];
  let i = 2;

  if (status) {
    query += ` AND os.status = $${i++}`;
    params.push(status);
  }
  if (busca) {
    query += ` AND (os.numero ILIKE $${i} OR c.nome ILIKE $${i + 1} OR v.placa ILIKE $${i + 2})`;
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
  }

  query += " ORDER BY os.id DESC";
  const result = await pool.query(query, params);
  return result.rows;
};

const buscarPorId = async (tenantId, id) => {
  const [os, produtos, servicos] = await Promise.all([
    pool.query(
      `SELECT os.*,
              c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
              v.marca as veiculo_marca, v.modelo as veiculo_modelo, v.placa as veiculo_placa,
              v.cor as veiculo_cor, v.ano as veiculo_ano
       FROM ordens_servico os
       LEFT JOIN clientes c ON os.cliente_id = c.id
       LEFT JOIN veiculos v ON os.veiculo_id = v.id
       WHERE os.id = $1 AND os.tenant_id = $2`,
      [id, tenantId],
    ),
    pool.query("SELECT * FROM os_produtos WHERE os_id = $1", [id]),
    pool.query("SELECT * FROM os_servicos WHERE os_id = $1", [id]),
  ]);
  if (!os.rows[0]) return null;
  return { ...os.rows[0], produtos: produtos.rows, servicos: servicos.rows };
};

// ─── Criação ──────────────────────────────────────────────────────────────────

const criar = async (
  tenantId,
  {
    cliente_id,
    veiculo_id,
    km,
    previsao_entrega,
    observacoes_veiculo,
    observacoes_gerais,
    responsavel_tecnico,
    produtos = [],
    servicos = [],
  },
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const numero = await gerarNumeroOS();
    const { valor_produtos, valor_servicos, valor_total } = calcularTotais(
      produtos,
      servicos,
    );

    const osResult = await client.query(
      `INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, km, previsao_entrega, observacoes_veiculo, observacoes_gerais, valor_produtos, valor_servicos, valor_total, responsavel_tecnico, status, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Aberta',$12) RETURNING id`,
      [
        numero,
        cliente_id,
        veiculo_id,
        km,
        previsao_entrega || null,
        observacoes_veiculo,
        observacoes_gerais,
        valor_produtos,
        valor_servicos,
        valor_total,
        responsavel_tecnico,
        tenantId,
      ],
    );
    const os_id = osResult.rows[0].id;

    for (const p of produtos) {
      await client.query(
        `INSERT INTO os_produtos (os_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total, baixa_estoque)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
        [
          os_id,
          p.produto_id,
          p.codigo,
          p.descricao,
          p.quantidade,
          p.valor_unitario,
          p.valor_total,
        ],
      );
    }
    await deducaoEstoque(client, os_id, produtos);

    for (const s of servicos) {
      await client.query(
        `INSERT INTO os_servicos (os_id, codigo, descricao, quantidade, valor_unitario, valor_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          os_id,
          s.codigo,
          s.descricao,
          s.quantidade,
          s.valor_unitario,
          s.valor_total,
        ],
      );
    }

    await client.query("COMMIT");
    return { id: os_id, numero };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ─── Atualização (gerencia estoque por status) ────────────────────────────────

const atualizar = async (
  tenantId,
  id,
  {
    status,
    responsavel_tecnico,
    km,
    previsao_entrega,
    observacoes_veiculo,
    observacoes_gerais,
  },
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const prev = await client.query(
      "SELECT * FROM ordens_servico WHERE id = $1 AND tenant_id = $2",
      [id, tenantId],
    );
    if (!prev.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const statusAnterior = prev.rows[0].status;

    await client.query(
      `UPDATE ordens_servico
       SET status=$1::varchar, responsavel_tecnico=$2::varchar, km=$3, previsao_entrega=$4,
           observacoes_veiculo=$5, observacoes_gerais=$6,
           finalizado_em = CASE WHEN $1::varchar = 'Finalizada' THEN CURRENT_TIMESTAMP ELSE finalizado_em END,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id=$7`,
      [
        status,
        responsavel_tecnico,
        km,
        previsao_entrega || null,
        observacoes_veiculo,
        observacoes_gerais,
        id,
      ],
    );

    const curr = await client.query(
      "SELECT * FROM ordens_servico WHERE id = $1",
      [id],
    );
    await registrarAuditoria(
      "ordens_servico",
      id,
      "UPDATE",
      prev.rows[0],
      curr.rows[0],
      "sistema",
      client,
    );

    // Finalizada → dar baixa no estoque (idempotente)
    if (status === "Finalizada" && statusAnterior !== "Finalizada") {
      const baixaExistente = await client.query(
        "SELECT id FROM movimentacoes_estoque WHERE os_id=$1 AND motivo='OS finalizada - baixa' LIMIT 1",
        [id],
      );
      if (baixaExistente.rows.length === 0) {
        const produtosOS = await client.query(
          "SELECT * FROM os_produtos WHERE os_id = $1",
          [id],
        );
        for (const p of produtosOS.rows) {
          if (!p.produto_id) continue;
          await client.query(
            "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
            [p.quantidade, p.produto_id],
          );
          await client.query(
            `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id)
             VALUES ($1,'SAIDA',$2,'OS finalizada - baixa',$3)`,
            [p.produto_id, p.quantidade, id],
          );
        }
      }
    }

    // Cancelada → devolver itens ao estoque (idempotente)
    if (status === "Cancelada" && statusAnterior !== "Cancelada") {
      const devolucaoExistente = await client.query(
        "SELECT id FROM movimentacoes_estoque WHERE os_id=$1 AND motivo='OS cancelada - devolução' LIMIT 1",
        [id],
      );
      if (devolucaoExistente.rows.length === 0) {
        const produtosOS = await client.query(
          "SELECT * FROM os_produtos WHERE os_id = $1",
          [id],
        );
        for (const p of produtosOS.rows) {
          if (!p.produto_id) continue;
          await client.query(
            "UPDATE produtos SET quantidade = quantidade + $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
            [p.quantidade, p.produto_id],
          );
          await client.query(
            `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, os_id)
             VALUES ($1,'ENTRADA',$2,'OS cancelada - devolução',$3)`,
            [p.produto_id, p.quantidade, id],
          );
        }
      }
    }

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export default { listar, buscarPorId, criar, atualizar };
