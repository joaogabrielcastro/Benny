import pool from "../../database.js";
import { resolveTenantId } from "../config/singleTenant.js";
import { notFound } from "../lib/AppError.js";
import { parseIdParam } from "../lib/controllerHelpers.js";

/**
 * Isola auditoria por tenant:
 * - recurso vivo no tenant, OU
 * - tenant_id persistido em dados_anteriores/dados_novos (histórico pós-DELETE).
 * Cross-tenant → 404 (sem vazamento).
 */
export function semSegredoAuditoria(row) {
  const limpar = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj ?? null;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (/token|api[_-]?key|senha|secret|certific|cpf|cnpj|payload|dados_envio/i.test(k)) {
        continue;
      }
      out[k] = v;
    }
    return out;
  };
  return {
    ...row,
    dados_anteriores: limpar(row.dados_anteriores),
    dados_novos: limpar(row.dados_novos),
  };
}

async function buscarAuditoriaEscopada(req, res, tabela, label) {
  const tenantId = resolveTenantId(req);
  const id = parseIdParam(req.params.id, label);

  const fiscalOs =
    tabela === "ordens_servico"
      ? `OR (
           a.tabela = 'notas_fiscais'
           AND COALESCE(NULLIF(a.dados_novos->>'ordem_servico_id', ''), '') = $1::text
           AND COALESCE(NULLIF(a.dados_novos->>'tenant_id', ''), '') = $2::text
         )`
      : "";

  const result = await pool.query(
    `
    SELECT a.*
    FROM auditoria a
    WHERE (
      (a.tabela = $3 AND a.registro_id = $1)
      ${fiscalOs}
    )
      AND (
        EXISTS (
          SELECT 1
          FROM ${tabela} t
          WHERE t.id = $1 AND t.tenant_id = $2
        )
        OR COALESCE(
          NULLIF(a.dados_novos->>'tenant_id', '')::integer,
          NULLIF(a.dados_anteriores->>'tenant_id', '')::integer
        ) = $2
      )
    ORDER BY a.criado_em DESC`,
    [id, tenantId, tabela],
  );

  if (result.rows.length > 0) {
    return res.json(result.rows.map(semSegredoAuditoria));
  }

  const vivo = await pool.query(
    `SELECT id FROM ${tabela} WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  if (vivo.rows[0]) {
    return res.json([]);
  }

  throw notFound(`${label} não encontrado`);
}

class AuditoriaController {
  async buscarPorOS(req, res) {
    return buscarAuditoriaEscopada(req, res, "ordens_servico", "Ordem de serviço");
  }

  async buscarPorOrcamento(req, res) {
    return buscarAuditoriaEscopada(req, res, "orcamentos", "Orçamento");
  }
}

export default new AuditoriaController();
