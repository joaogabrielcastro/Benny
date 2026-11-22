import pool from "../../../database.js";
import { SINGLE_TENANT_ID } from "../../config/singleTenant.js";
import { mapNfParaRespostaApi } from "./notasFiscaisMapper.js";

export function colunaVinculoOs(modeloDocumento) {
  return modeloDocumento === "NFE" ? "nf_nfe_id" : "nf_id";
}

export function clienteDaOs(osRow, clienteDb) {
  if (clienteDb) return clienteDb;
  return {
    nome: osRow.cliente_nome,
    telefone: osRow.cliente_telefone,
    cpf_cnpj: osRow.cliente_cpf_cnpj,
    email: osRow.cliente_email,
    endereco: osRow.cliente_endereco,
    numero: osRow.cliente_numero,
    complemento: osRow.cliente_complemento,
    bairro: osRow.cliente_bairro,
    cidade: osRow.cliente_cidade,
    estado: osRow.cliente_estado,
    cep: osRow.cliente_cep,
    codigo_ibge: osRow.cliente_codigo_ibge,
  };
}

export async function persistirAtualizacaoNf(
  nfId,
  tenantId,
  osId,
  campos,
  modeloDocumento = "NFSE",
) {
  try {
    return await persistirAtualizacaoNfQuery(
      nfId,
      tenantId,
      osId,
      campos,
      modeloDocumento,
    );
  } catch (e) {
    const msg = String(e?.message || e);
    if (
      e?.code === "22001" ||
      /value too long for type character varying/i.test(msg)
    ) {
      throw new Error(
        "Valor fiscal maior que o campo no banco (numero/chave). Confirme migrations 012 e 013 no redeploy e tente Consultar de novo.",
      );
    }
    throw e;
  }
}

async function persistirAtualizacaoNfQuery(
  nfId,
  tenantId,
  osId,
  campos,
  modeloDocumento = "NFSE",
) {
  const r = await pool.query(
    `UPDATE notas_fiscais SET
       status = COALESCE($1, status),
       id_provedor = COALESCE($2, id_provedor),
       numero = COALESCE($3, numero),
       chave_acesso = COALESCE($4, chave_acesso),
       link_pdf = COALESCE($5, link_pdf),
       mensagem_status = $6,
       dados_resposta = COALESCE($7::jsonb, dados_resposta),
       data_emissao = COALESCE($8, data_emissao),
       tributos = COALESCE($9::jsonb, tributos),
       serie = COALESCE($12, serie),
       protocolo = COALESCE($13, protocolo),
       atualizado_em = NOW()
     WHERE id = $10 AND tenant_id = $11
     RETURNING *`,
    [
      campos.status,
      campos.idProvedor || null,
      campos.numeroNf || null,
      campos.chaveAcesso || null,
      campos.linkPdf || null,
      campos.mensagem,
      campos.dadosResposta ? JSON.stringify(campos.dadosResposta) : null,
      campos.dataEmissao,
      campos.tributos ? JSON.stringify(campos.tributos) : null,
      nfId,
      tenantId,
      campos.serie || null,
      campos.protocolo || null,
    ],
  );
  if (r.rows[0]) {
    const col = colunaVinculoOs(modeloDocumento);
    await pool.query(
      `UPDATE ordens_servico SET ${col} = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3`,
      [nfId, osId, tenantId],
    );
  }
  return r.rows[0] || null;
}

export const listar = async (
  tenantId = SINGLE_TENANT_ID,
  { limit = 20, offset = 0, status, modelo, busca, data_inicio, data_fim } = {},
) => {
  const params = [tenantId];
  let where = "WHERE nf.tenant_id = $1";
  if (status) {
    params.push(status);
    where += ` AND nf.status = $${params.length}`;
  }
  if (modelo) {
    params.push(String(modelo).toUpperCase() === "NFE" ? "NFE" : "NFSE");
    where += ` AND nf.modelo_documento = $${params.length}`;
  }
  if (busca) {
    params.push(`%${busca}%`);
    const b = `$${params.length}`;
    where += ` AND (nf.numero ILIKE ${b} OR os.numero ILIKE ${b} OR c.nome ILIKE ${b} OR nf.chave_acesso ILIKE ${b})`;
  }
  if (data_inicio) {
    params.push(data_inicio);
    where += ` AND COALESCE(nf.data_emissao, nf.criado_em) >= $${params.length}::date`;
  }
  if (data_fim) {
    params.push(data_fim);
    where += ` AND COALESCE(nf.data_emissao, nf.criado_em) < ($${params.length}::date + INTERVAL '1 day')`;
  }
  const from = `FROM notas_fiscais nf
    LEFT JOIN ordens_servico os ON os.id = nf.ordem_servico_id AND os.tenant_id = nf.tenant_id
    LEFT JOIN clientes c ON c.id = os.cliente_id`;
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total ${from} ${where}`,
    params,
  );
  const total = countRes.rows[0]?.total ?? 0;
  const r = await pool.query(
    `SELECT nf.*, os.numero AS os_numero, c.nome AS cliente_nome
     ${from} ${where}
     ORDER BY nf.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return {
    rows: r.rows.map((row) => ({
      ...mapNfParaRespostaApi(row),
      ordem_servico_id: row.ordem_servico_id,
      os_numero: row.os_numero ?? null,
      cliente_nome: row.cliente_nome ?? null,
      criado_em: row.criado_em ?? null,
    })),
    total,
  };
};

export const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {
  const r = await pool.query(
    `SELECT * FROM notas_fiscais WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  return r.rows[0] || null;
};

export const buscarPorOsId = async (
  tenantId = SINGLE_TENANT_ID,
  osId,
  modeloDocumento = "NFSE",
) => {
  const r = await pool.query(
    `SELECT * FROM notas_fiscais
     WHERE ordem_servico_id = $1 AND tenant_id = $2 AND modelo_documento = $3`,
    [osId, tenantId, modeloDocumento],
  );
  return r.rows[0] || null;
};

export const listarPorOsId = async (tenantId = SINGLE_TENANT_ID, osId) => {
  const r = await pool.query(
    `SELECT * FROM notas_fiscais
     WHERE ordem_servico_id = $1 AND tenant_id = $2
     ORDER BY modelo_documento`,
    [osId, tenantId],
  );
  return r.rows;
};

/** Limpa vínculo órfão (sandbox × produção) para permitir reemissão. */
export async function marcarNotaRejeitadaAmbiente(
  nfId,
  tenantId,
  osId,
  modeloDocumento,
  mensagem,
) {
  const r = await pool.query(
    `UPDATE notas_fiscais SET
       status = 'rejeitada',
       id_provedor = NULL,
       mensagem_status = $1,
       atualizado_em = NOW()
     WHERE id = $2 AND tenant_id = $3
     RETURNING *`,
    [mensagem, nfId, tenantId],
  );
  if (r.rows[0]) {
    const col = colunaVinculoOs(modeloDocumento);
    await pool.query(
      `UPDATE ordens_servico SET ${col} = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3`,
      [nfId, osId, tenantId],
    );
  }
  return r.rows[0] || null;
}
