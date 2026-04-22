import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import { randomBytes } from "crypto";
import pool from "../../database.js";
import { registrarAuditoria } from "../utils/auditoria.js";

// ─── Helpers internos ─────────────────────────────────────────────────────────

async function gerarNumeroOrcamento() {
  const result = await pool.query(
    "SELECT numero FROM orcamentos ORDER BY id DESC LIMIT 1",
  );
  if (result.rows.length === 0) return "ORC-0001";
  const n = parseInt(result.rows[0].numero.split("-")[1]) + 1;
  return `ORC-${n.toString().padStart(4, "0")}`;
}

async function gerarTokenPublico() {
  let token;
  let existe = true;
  while (existe) {
    token = randomBytes(32).toString("hex");
    const result = await pool.query(
      "SELECT id FROM orcamentos WHERE token_publico = $1",
      [token],
    );
    existe = result.rows.length > 0;
  }
  return token;
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

async function inserirItens(
  client,
  orcamento_id,
  produtos = [],
  servicos = [],
) {
  for (const p of produtos) {
    await client.query(
      `INSERT INTO orcamento_produtos (orcamento_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orcamento_id,
        p.produto_id,
        p.codigo,
        p.descricao,
        p.quantidade,
        p.valor_unitario,
        p.valor_total,
      ],
    );
  }
  for (const s of servicos) {
    await client.query(
      `INSERT INTO orcamento_servicos (orcamento_id, codigo, descricao, quantidade, valor_unitario, valor_total)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        orcamento_id,
        s.codigo,
        s.descricao,
        s.quantidade,
        s.valor_unitario,
        s.valor_total,
      ],
    );
  }
}

async function darBaixaEstoque(client, orcamento_id) {
  // Idempotente: verifica se já existe movimentação
  const movExistente = await client.query(
    "SELECT id FROM movimentacoes_estoque WHERE orcamento_id = $1 AND motivo = 'Orçamento aprovado' LIMIT 1",
    [orcamento_id],
  );
  if (movExistente.rows.length > 0) return;

  const produtos = await client.query(
    "SELECT * FROM orcamento_produtos WHERE orcamento_id = $1",
    [orcamento_id],
  );

  for (const p of produtos.rows) {
    if (!p.produto_id) continue;
    await client.query(
      "UPDATE produtos SET quantidade = quantidade - $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2",
      [p.quantidade, p.produto_id],
    );
    await client.query(
      `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, orcamento_id)
       VALUES ($1, 'SAIDA', $2, 'Orçamento aprovado', $3)`,
      [p.produto_id, p.quantidade, orcamento_id],
    );
  }
}

// ─── Operações públicas ───────────────────────────────────────────────────────

const listar = async (tenantId = SINGLE_TENANT_ID, { status, busca } = {}) => {
  let query = `
    SELECT o.*,
           c.nome as cliente_nome, c.telefone as cliente_telefone,
           v.modelo as veiculo_modelo, v.placa as veiculo_placa
    FROM orcamentos o
    LEFT JOIN clientes c ON o.cliente_id = c.id
    LEFT JOIN veiculos v ON o.veiculo_id = v.id
    WHERE o.tenant_id = $1
  `;
  const params = [tenantId];
  let i = 2;

  if (status) {
    query += ` AND o.status = $${i++}`;
    params.push(status);
  }
  if (busca) {
    query += ` AND (o.numero ILIKE $${i} OR c.nome ILIKE $${i + 1} OR v.placa ILIKE $${i + 2})`;
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
  }

  query += " ORDER BY o.id DESC";
  const result = await pool.query(query, params);
  return result.rows;
};

const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {
  const [orc, produtos, servicos] = await Promise.all([
    pool.query(
      `SELECT o.*,
              c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
              v.modelo as veiculo_modelo, v.placa as veiculo_placa, v.cor as veiculo_cor
       FROM orcamentos o
       LEFT JOIN clientes c ON o.cliente_id = c.id
       LEFT JOIN veiculos v ON o.veiculo_id = v.id
       WHERE o.id = $1 AND o.tenant_id = $2`,
      [id, tenantId],
    ),
    pool.query("SELECT * FROM orcamento_produtos WHERE orcamento_id = $1", [
      id,
    ]),
    pool.query("SELECT * FROM orcamento_servicos WHERE orcamento_id = $1", [
      id,
    ]),
  ]);
  if (!orc.rows[0]) return null;
  return { ...orc.rows[0], produtos: produtos.rows, servicos: servicos.rows };
};

const buscarPorToken = async (token) => {
  const orc = await pool.query(
    `SELECT o.*,
            c.nome as cliente_nome, c.telefone as cliente_telefone, c.cpf_cnpj as cliente_cpf_cnpj,
            v.modelo as veiculo_modelo, v.placa as veiculo_placa, v.cor as veiculo_cor
     FROM orcamentos o
     LEFT JOIN clientes c ON o.cliente_id = c.id
     LEFT JOIN veiculos v ON o.veiculo_id = v.id
     WHERE o.token_publico = $1`,
    [token],
  );
  if (!orc.rows[0]) return null;

  const [produtos, servicos] = await Promise.all([
    pool.query("SELECT * FROM orcamento_produtos WHERE orcamento_id = $1", [
      orc.rows[0].id,
    ]),
    pool.query("SELECT * FROM orcamento_servicos WHERE orcamento_id = $1", [
      orc.rows[0].id,
    ]),
  ]);
  return { ...orc.rows[0], produtos: produtos.rows, servicos: servicos.rows };
};

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
    const numero = await gerarNumeroOrcamento();
    const tokenPublico = await gerarTokenPublico();
    const { valor_produtos, valor_servicos, valor_total } = calcularTotais(
      produtos,
      servicos,
    );

    const result = await client.query(
      `INSERT INTO orcamentos (numero, cliente_id, veiculo_id, km, previsao_entrega, observacoes_veiculo, observacoes_gerais, responsavel_tecnico, valor_produtos, valor_servicos, valor_total, token_publico, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        numero,
        cliente_id,
        veiculo_id,
        km,
        previsao_entrega || null,
        observacoes_veiculo,
        observacoes_gerais,
        responsavel_tecnico || null,
        valor_produtos,
        valor_servicos,
        valor_total,
        tokenPublico,
        tenantId,
      ],
    );
    const orcamento_id = result.rows[0].id;
    await inserirItens(client, orcamento_id, produtos, servicos);

    await client.query("COMMIT");
    return { id: orcamento_id, numero };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const atualizar = async (
  tenantId,
  id,
  {
    status,
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

    const prev = await client.query(
      "SELECT * FROM orcamentos WHERE id = $1 AND tenant_id = $2",
      [id, tenantId],
    );
    if (!prev.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const { valor_produtos, valor_servicos, valor_total } = calcularTotais(
      produtos,
      servicos,
    );

    await client.query(
      `UPDATE orcamentos
       SET status=$1, km=$2, previsao_entrega=$3, observacoes_veiculo=$4, observacoes_gerais=$5,
           responsavel_tecnico=$6, valor_produtos=$7, valor_servicos=$8, valor_total=$9,
           atualizado_em=CURRENT_TIMESTAMP
       WHERE id=$10 AND tenant_id=$11`,
      [
        status,
        km,
        previsao_entrega || null,
        observacoes_veiculo,
        observacoes_gerais,
        responsavel_tecnico || null,
        valor_produtos,
        valor_servicos,
        valor_total,
        id,
        tenantId,
      ],
    );

    await client.query(
      "DELETE FROM orcamento_produtos WHERE orcamento_id = $1",
      [id],
    );
    await client.query(
      "DELETE FROM orcamento_servicos WHERE orcamento_id = $1",
      [id],
    );
    await inserirItens(client, id, produtos, servicos);

    const curr = await client.query("SELECT * FROM orcamentos WHERE id = $1", [
      id,
    ]);
    await registrarAuditoria(
      "orcamentos",
      id,
      "UPDATE",
      prev.rows[0],
      curr.rows[0],
      "sistema",
      client,
    );

    if (status === "Aprovado" && prev.rows[0].status !== "Aprovado") {
      await darBaixaEstoque(client, id);
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

const aprovarPorToken = async (token) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const statusAtual = await client.query(
      "SELECT id, status FROM orcamentos WHERE token_publico = $1",
      [token],
    );
    if (!statusAtual.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const { id: orcamentoId, status } = statusAtual.rows[0];
    const jaAprovado = status === "Aprovado";

    const result = await client.query(
      "UPDATE orcamentos SET status='Aprovado', atualizado_em=CURRENT_TIMESTAMP WHERE token_publico=$1 RETURNING *",
      [token],
    );

    if (!jaAprovado) {
      await darBaixaEstoque(client, orcamentoId);
    }

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const reprovarPorToken = async (token) => {
  const result = await pool.query(
    "UPDATE orcamentos SET status='Reprovado', atualizado_em=CURRENT_TIMESTAMP WHERE token_publico=$1 RETURNING *",
    [token],
  );
  return result.rows[0] || null;
};

const converterEmOS = async (tenantId = SINGLE_TENANT_ID, id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orc = await client.query(
      "SELECT * FROM orcamentos WHERE id = $1 AND tenant_id = $2",
      [id, tenantId],
    );
    if (!orc.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    if (orc.rows[0].status !== "Aprovado") {
      const err = new Error(
        "Apenas orçamentos aprovados podem ser convertidos em OS",
      );
      err.code = "STATUS_INVALIDO";
      throw err;
    }

    // Gerar número de OS
    const osNumResult = await client.query(
      "SELECT numero FROM ordens_servico ORDER BY id DESC LIMIT 1",
    );
    let numero;
    if (osNumResult.rows.length === 0) {
      numero = "OS-0001";
    } else {
      const n = parseInt(osNumResult.rows[0].numero.split("-")[1]) + 1;
      numero = `OS-${n.toString().padStart(4, "0")}`;
    }

    const o = orc.rows[0];
    const osResult = await client.query(
      `INSERT INTO ordens_servico (numero, cliente_id, veiculo_id, km, previsao_entrega, observacoes_veiculo, observacoes_gerais, valor_produtos, valor_servicos, valor_total, orcamento_id, status, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Aberta',$12) RETURNING id`,
      [
        numero,
        o.cliente_id,
        o.veiculo_id,
        o.km,
        o.previsao_entrega || null,
        o.observacoes_veiculo,
        o.observacoes_gerais,
        o.valor_produtos,
        o.valor_servicos,
        o.valor_total,
        o.id,
        tenantId,
      ],
    );
    const os_id = osResult.rows[0].id;

    const [produtosOrc, servicosOrc] = await Promise.all([
      client.query("SELECT * FROM orcamento_produtos WHERE orcamento_id = $1", [
        id,
      ]),
      client.query("SELECT * FROM orcamento_servicos WHERE orcamento_id = $1", [
        id,
      ]),
    ]);

    for (const p of produtosOrc.rows) {
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
    for (const s of servicosOrc.rows) {
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

export default {
  listar,
  buscarPorId,
  buscarPorToken,
  criar,
  atualizar,
  aprovarPorToken,
  reprovarPorToken,
  converterEmOS,
};
