import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";
import { calcularTotais } from "../domain/calcularTotais.js";
import { proximoNumeroOS } from "../domain/numeracao.js";
import { registrarAuditoria } from "../utils/auditoria.js";
import { produtosTemColunaNcm } from "../lib/schemaCache.js";

async function queryProdutosOs(osId) {
  const temNcm = await produtosTemColunaNcm(pool);
  if (temNcm) {
    return pool.query(
      `SELECT op.*, p.ncm AS produto_ncm
       FROM os_produtos op
       LEFT JOIN produtos p ON p.id = op.produto_id
       WHERE op.os_id = $1`,
      [osId],
    );
  }
  return pool.query("SELECT * FROM os_produtos WHERE os_id = $1", [osId]);
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

/** Desfaz movimentações de estoque ligadas à OS antes de excluir o registro. */
async function reverterMovimentacoesEstoquePorOs(client, osId) {
  const { rows } = await client.query(
    "SELECT produto_id, tipo, quantidade FROM movimentacoes_estoque WHERE os_id = $1",
    [osId],
  );
  for (const m of rows) {
    if (m.tipo === "SAIDA") {
      await client.query(
        "UPDATE produtos SET quantidade = quantidade + $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
        [m.quantidade, m.produto_id],
      );
    } else if (m.tipo === "ENTRADA") {
      await client.query(
        "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
        [m.quantidade, m.produto_id],
      );
    }
  }
  await client.query("DELETE FROM movimentacoes_estoque WHERE os_id = $1", [
    osId,
  ]);
}

// ─── Listagem ─────────────────────────────────────────────────────────────────

const ORDENAR_COLUNAS = {
  numero: "os.numero",
  cliente_nome: "c.nome",
  valor_total: "os.valor_total",
  status: "os.status",
  criado_em: "os.criado_em",
};

const listar = async (
  tenantId = SINGLE_TENANT_ID,
  {
    status,
    busca,
    cliente_id,
    data_inicio,
    data_fim,
    ordenar = "criado_em",
    direcao = "desc",
    limit = 20,
    offset = 0,
  } = {},
) => {
  let where = "WHERE os.tenant_id = $1";
  const params = [tenantId];
  let i = 2;

  if (status) {
    where += ` AND os.status = $${i++}`;
    params.push(status);
  }
  if (busca) {
    where += ` AND (os.numero ILIKE $${i} OR c.nome ILIKE $${i + 1} OR v.placa ILIKE $${i + 2})`;
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    i += 3;
  }
  if (cliente_id) {
    where += ` AND os.cliente_id = $${i++}`;
    params.push(cliente_id);
  }
  if (data_inicio) {
    where += ` AND os.criado_em >= $${i++}::date`;
    params.push(data_inicio);
  }
  if (data_fim) {
    where += ` AND os.criado_em < ($${i++}::date + INTERVAL '1 day')`;
    params.push(data_fim);
  }

  const fromJoin = `
    FROM ordens_servico os
    LEFT JOIN clientes c ON os.cliente_id = c.id
    LEFT JOIN veiculos v ON os.veiculo_id = v.id
  `;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total ${fromJoin} ${where}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  const sortCol = ORDENAR_COLUNAS[ordenar] || ORDENAR_COLUNAS.criado_em;
  const sortDir = String(direcao).toLowerCase() === "asc" ? "ASC" : "DESC";

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const dataResult = await pool.query(
    `SELECT os.*,
            c.nome as cliente_nome, c.telefone as cliente_telefone,
            v.modelo as veiculo_modelo, v.placa as veiculo_placa,
            v.cor as veiculo_cor, v.ano as veiculo_ano, v.chassi as veiculo_chassi
     ${fromJoin}
     ${where}
     ORDER BY ${sortCol} ${sortDir}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, limit, offset],
  );

  return { rows: dataResult.rows, total };
};

const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {
  const [os, produtos, servicos] = await Promise.all([
    pool.query(
      `SELECT os.*,
              c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
              c.email as cliente_email, c.endereco as cliente_endereco, c.numero as cliente_numero,
              c.complemento as cliente_complemento, c.bairro as cliente_bairro,
              c.cidade as cliente_cidade, c.estado as cliente_estado, c.cep as cliente_cep,
              c.codigo_ibge as cliente_codigo_ibge,
              v.modelo as veiculo_modelo, v.placa as veiculo_placa,
              v.cor as veiculo_cor, v.ano as veiculo_ano, v.chassi as veiculo_chassi
       FROM ordens_servico os
       LEFT JOIN clientes c ON os.cliente_id = c.id
       LEFT JOIN veiculos v ON os.veiculo_id = v.id
       WHERE os.id = $1 AND os.tenant_id = $2`,
      [id, tenantId],
    ),
    queryProdutosOs(id),
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
    const numero = await proximoNumeroOS(client);
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

    const prevRow = prev.rows[0];
    const kmFinal =
      km !== undefined && km !== null && km !== "" ? km : prevRow.km;
    const previsaoFinal =
      previsao_entrega !== undefined
        ? previsao_entrega || null
        : prevRow.previsao_entrega;
    const obsVeiculoFinal =
      observacoes_veiculo !== undefined
        ? observacoes_veiculo
        : prevRow.observacoes_veiculo;
    const obsGeraisFinal =
      observacoes_gerais !== undefined
        ? observacoes_gerais
        : prevRow.observacoes_gerais;
    const respTecnicoFinal =
      responsavel_tecnico !== undefined
        ? responsavel_tecnico
        : prevRow.responsavel_tecnico;

    await client.query(
      `UPDATE ordens_servico
       SET status=$1::varchar, responsavel_tecnico=$2::varchar, km=$3, previsao_entrega=$4,
           observacoes_veiculo=$5, observacoes_gerais=$6,
           finalizado_em = CASE WHEN $1::varchar = 'Finalizada' THEN CURRENT_TIMESTAMP ELSE finalizado_em END,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id=$7 AND tenant_id=$8`,
      [
        status,
        respTecnicoFinal,
        kmFinal,
        previsaoFinal,
        obsVeiculoFinal,
        obsGeraisFinal,
        id,
        tenantId,
      ],
    );

    const curr = await client.query(
      "SELECT * FROM ordens_servico WHERE id = $1 AND tenant_id = $2",
      [id, tenantId],
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

const deletar = async (tenantId = SINGLE_TENANT_ID, id) => {
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

    await reverterMovimentacoesEstoquePorOs(client, id);

    await registrarAuditoria(
      "ordens_servico",
      id,
      "DELETE",
      prev.rows[0],
      null,
      "sistema",
      client,
    );

    await client.query(
      "DELETE FROM ordens_servico WHERE id = $1 AND tenant_id = $2",
      [id, tenantId],
    );

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export default { listar, buscarPorId, criar, atualizar, deletar };
