import pool from "../../database.js";
import { resolveTenantId } from "../config/singleTenant.js";

/**
 * Isola auditoria por tenant: registro vivo no tenant OU tenant_id
 * persistido em dados_anteriores/dados_novos (histórico após DELETE).
 */
function sqlAuditoriaPorTabela(tabela) {
  return `
    SELECT a.*
    FROM auditoria a
    WHERE a.tabela = '${tabela}'
      AND a.registro_id = $1
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
    ORDER BY a.criado_em DESC`;
}

class AuditoriaController {
  async buscarPorOS(req, res) {
    const tenantId = resolveTenantId(req);
    const result = await pool.query(sqlAuditoriaPorTabela("ordens_servico"), [
      req.params.id,
      tenantId,
    ]);
    res.json(result.rows);
  }

  async buscarPorOrcamento(req, res) {
    const tenantId = resolveTenantId(req);
    const result = await pool.query(sqlAuditoriaPorTabela("orcamentos"), [
      req.params.id,
      tenantId,
    ]);
    res.json(result.rows);
  }
}

export default new AuditoriaController();
