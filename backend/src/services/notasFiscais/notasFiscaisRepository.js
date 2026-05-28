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
  };
}

export async function persistirAtualizacaoNf(
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
       atualizado_em = NOW()
     WHERE id = $10 AND tenant_id = $11
     RETURNING *`,
    [
      campos.status,
      campos.idProvedor,
      campos.numeroNf,
      campos.chaveAcesso,
      campos.linkPdf,
      campos.mensagem,
      campos.dadosResposta ? JSON.stringify(campos.dadosResposta) : null,
      campos.dataEmissao,
      campos.tributos ? JSON.stringify(campos.tributos) : null,
      nfId,
      tenantId,
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
  { limit = 20, offset = 0 } = {},
) => {
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM notas_fiscais WHERE tenant_id = $1`,
    [tenantId],
  );
  const total = countRes.rows[0]?.total ?? 0;
  const r = await pool.query(
    `SELECT * FROM notas_fiscais WHERE tenant_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return { rows: r.rows.map(mapNfParaRespostaApi), total };
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
