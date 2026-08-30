import pool from "../../../database.js";
import { SINGLE_TENANT_ID } from "../../config/singleTenant.js";
import {
  montarResumoFromNotas,
  validarPeriodo,
} from "./fechamentoMensalUtils.js";
import { exportarPacoteZip } from "./fechamentoMensalExport.js";

async function listarNotasDoMes(tenantId, ano, mes) {
  const r = await pool.query(
    `SELECT nf.*, os.numero AS os_numero
     FROM notas_fiscais nf
     LEFT JOIN ordens_servico os ON os.id = nf.ordem_servico_id
     WHERE nf.tenant_id = $1
       AND nf.data_emissao IS NOT NULL
       AND EXTRACT(YEAR FROM nf.data_emissao AT TIME ZONE 'America/Sao_Paulo') = $2
       AND EXTRACT(MONTH FROM nf.data_emissao AT TIME ZONE 'America/Sao_Paulo') = $3
     ORDER BY nf.data_emissao ASC, nf.id ASC`,
    [tenantId, ano, mes],
  );
  return r.rows;
}

export async function obterResumo(tenantId = SINGLE_TENANT_ID, ano, mes) {
  const periodo = validarPeriodo(ano, mes);
  if (!periodo.ok) return { erro: periodo.erro };

  const rows = await listarNotasDoMes(tenantId, periodo.ano, periodo.mes);
  return montarResumoFromNotas(rows, periodo.ano, periodo.mes);
}

export async function exportarZip(tenantId = SINGLE_TENANT_ID, ano, mes) {
  const resumo = await obterResumo(tenantId, ano, mes);
  if (resumo.erro) return { erro: resumo.erro };

  return exportarPacoteZip(resumo, tenantId);
}

export default { obterResumo, exportarZip };
