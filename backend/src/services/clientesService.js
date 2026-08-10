import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import pool from "../../database.js";
import { resolveCodigoIbgeCliente } from "../domain/clienteIbge.js";
import { AppError } from "../lib/AppError.js";

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

export function normalizarBuscaCliente(busca) {
  const texto = String(busca || "").trim();
  return { texto, digitos: onlyDigits(texto) };
}

const listar = async (
  tenantId = SINGLE_TENANT_ID,
  { busca, limit = 20, offset = 0 } = {},
) => {
  const params = [tenantId];
  let where = "WHERE tenant_id = $1";

  const termo = normalizarBuscaCliente(busca);
  if (termo.texto) {
    params.push(`%${termo.texto}%`);
    const textoIdx = params.length;

    if (termo.digitos) {
      params.push(`%${termo.digitos}%`);
      const digitosIdx = params.length;
      where += ` AND (
        LOWER(nome) LIKE LOWER($${textoIdx})
        OR regexp_replace(COALESCE(telefone, ''), '[^0-9]', '', 'g') LIKE $${digitosIdx}
        OR regexp_replace(COALESCE(cpf_cnpj, ''), '[^0-9]', '', 'g') LIKE $${digitosIdx}
      )`;
    } else {
      where += ` AND (
        LOWER(nome) LIKE LOWER($${textoIdx})
        OR LOWER(COALESCE(telefone, '')) LIKE LOWER($${textoIdx})
        OR LOWER(COALESCE(cpf_cnpj, '')) LIKE LOWER($${textoIdx})
      )`;
    }
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM clientes ${where}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const dataResult = await pool.query(
    `SELECT * FROM clientes ${where} ORDER BY nome LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, limit, offset],
  );

  return { rows: dataResult.rows, total };
};

const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {
  const result = await pool.query(
    "SELECT * FROM clientes WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  return result.rows[0] || null;
};

const criar = async (
  tenantId,
  {
    nome,
    telefone,
    cpf_cnpj,
    email,
    endereco,
    cep,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    codigo_ibge,
  },
) => {
  const ibge = await resolveCodigoIbgeCliente(cep, codigo_ibge);
  const result = await pool.query(
    `INSERT INTO clientes (nome, telefone, cpf_cnpj, email, endereco, cep, numero, complemento, bairro, cidade, estado, codigo_ibge, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [
      nome,
      telefone,
      cpf_cnpj,
      email,
      endereco,
      onlyDigits(cep) || cep,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      ibge,
      tenantId,
    ],
  );
  return result.rows[0];
};

const atualizar = async (
  tenantId,
  id,
  {
    nome,
    telefone,
    cpf_cnpj,
    email,
    endereco,
    cep,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    codigo_ibge,
  },
) => {
  const ibge = await resolveCodigoIbgeCliente(cep, codigo_ibge);
  await pool.query(
    `UPDATE clientes
     SET nome=$1, telefone=$2, cpf_cnpj=$3, email=$4, endereco=$5,
         cep=$6, numero=$7, complemento=$8, bairro=$9, cidade=$10, estado=$11,
         codigo_ibge=$12, atualizado_em=CURRENT_TIMESTAMP
     WHERE id=$13 AND tenant_id=$14`,
    [
      nome,
      telefone,
      cpf_cnpj,
      email,
      endereco,
      onlyDigits(cep) || cep,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      ibge,
      id,
      tenantId,
    ],
  );
};

async function reverterMovimentacoesEstoque(client, { osId, orcamentoId }) {
  const filtro = osId
    ? { sql: "os_id = $1", id: osId }
    : { sql: "orcamento_id = $1", id: orcamentoId };

  const { rows } = await client.query(
    `SELECT produto_id, tipo, quantidade FROM movimentacoes_estoque WHERE ${filtro.sql}`,
    [filtro.id],
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

  await client.query(
    `DELETE FROM movimentacoes_estoque WHERE ${filtro.sql}`,
    [filtro.id],
  );
}

/**
 * Remove o cliente e todo o histórico vinculado (OS, orçamentos, veículos,
 * agendamentos, lembretes e registros locais de NF), revertendo estoque.
 * Não cancela NFS-e/NF-e na prefeitura/SEFAZ — só apaga o vínculo no Benny.
 */
const deletar = async (tenantId = SINGLE_TENANT_ID, id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cliente = await client.query(
      "SELECT id, nome FROM clientes WHERE id = $1 AND tenant_id = $2 FOR UPDATE",
      [id, tenantId],
    );
    if (!cliente.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }

    const osRows = await client.query(
      "SELECT id FROM ordens_servico WHERE cliente_id = $1 AND tenant_id = $2",
      [id, tenantId],
    );
    const orcRows = await client.query(
      "SELECT id FROM orcamentos WHERE cliente_id = $1 AND tenant_id = $2",
      [id, tenantId],
    );
    const agRows = await client.query(
      "SELECT id FROM agendamentos WHERE cliente_id = $1 AND tenant_id = $2",
      [id, tenantId],
    );
    const veicRows = await client.query(
      "SELECT id FROM veiculos WHERE cliente_id = $1 AND tenant_id = $2",
      [id, tenantId],
    );
    const nfCount = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM notas_fiscais nf
       JOIN ordens_servico os ON os.id = nf.ordem_servico_id
       WHERE os.cliente_id = $1 AND os.tenant_id = $2`,
      [id, tenantId],
    );

    for (const os of osRows.rows) {
      await reverterMovimentacoesEstoque(client, { osId: os.id });
      // Quebra ciclo OS ↔ notas_fiscais antes do DELETE
      await client.query(
        "UPDATE ordens_servico SET nf_id = NULL, nf_nfe_id = NULL WHERE id = $1",
        [os.id],
      );
      await client.query(
        "DELETE FROM notas_fiscais WHERE ordem_servico_id = $1 AND tenant_id = $2",
        [os.id, tenantId],
      );
      await client.query(
        "DELETE FROM ordens_servico WHERE id = $1 AND tenant_id = $2",
        [os.id, tenantId],
      );
    }

    for (const orc of orcRows.rows) {
      await reverterMovimentacoesEstoque(client, { orcamentoId: orc.id });
      await client.query(
        "DELETE FROM orcamentos WHERE id = $1 AND tenant_id = $2",
        [orc.id, tenantId],
      );
    }

    if (agRows.rows.length > 0) {
      const agIds = agRows.rows.map((a) => a.id);
      await client.query(
        `DELETE FROM lembretes
         WHERE tipo = 'agendamento' AND referencia_id = ANY($1::int[])`,
        [agIds],
      );
      await client.query(
        "DELETE FROM agendamentos WHERE cliente_id = $1 AND tenant_id = $2",
        [id, tenantId],
      );
    }

    await client.query(
      "DELETE FROM veiculos WHERE cliente_id = $1 AND tenant_id = $2",
      [id, tenantId],
    );

    const result = await client.query(
      "DELETE FROM clientes WHERE id = $1 AND tenant_id = $2 RETURNING id, nome",
      [id, tenantId],
    );

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      removidos: {
        ordens_servico: osRows.rows.length,
        orcamentos: orcRows.rows.length,
        agendamentos: agRows.rows.length,
        veiculos: veicRows.rows.length,
        notas_fiscais: nfCount.rows[0]?.total ?? 0,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23503") {
      throw new AppError(
        409,
        "Não foi possível excluir o cliente porque ainda há vínculos no sistema.",
      );
    }
    throw error;
  } finally {
    client.release();
  }
};

export default { listar, buscarPorId, criar, atualizar, deletar };
