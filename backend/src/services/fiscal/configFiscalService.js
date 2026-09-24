import { SINGLE_TENANT_MODE } from "../../config/singleTenant.js";
import { registrarAuditoria } from "../../utils/auditoria.js";
import { carregarConfiguracoesTenant } from "./credentials.js";
import { AppError } from "../../lib/AppError.js";
import {
  REGIMES_FISCAIS,
  configFiscalDe,
  mesclarRegimeFiscal,
  validarConfigFiscal,
} from "../../domain/configuracaoFiscalTenant.js";

export async function getFiscalConfig(tenantId) {
  const configuracoes = await carregarConfiguracoesTenant(tenantId);
  return (
    configFiscalDe(configuracoes, { singleTenant: SINGLE_TENANT_MODE }) || {
      regimeTributario: null,
      crt: null,
      rotulo: null,
      origem: null,
      familia: null,
      icms: null,
      origemIcms: null,
    }
  );
}

export async function validarConfigFiscalTenant(tenantId) {
  const configuracoes = await carregarConfiguracoesTenant(tenantId);
  return validarConfigFiscal(configuracoes, { singleTenant: SINGLE_TENANT_MODE });
}

export async function salvarRegimeFiscal(tenantId, regimeTributario, codigoIcms, operacao, usuario = "sistema") {
  const { default: pool } = await import("../../../database.js");
  const atual = await carregarConfiguracoesTenant(tenantId);
  const anterior = configFiscalDe(atual, { singleTenant: false });
  let proximo;
  try {
    proximo = mesclarRegimeFiscal(atual, regimeTributario, codigoIcms, {
      uf: operacao.uf,
      vendaInterna: operacao.cfop_interno,
      vendaInterestadual: operacao.cfop_interestadual,
    });
  } catch (err) {
    const code = err.code || "NFE_CONFIGURACAO_FISCAL_INCOMPLETA";
    const message = code === "NFE_CONFIGURACAO_FISCAL_INCOMPATIVEL"
      ? "A configuração fiscal da operação é incompatível."
      : "A configuração fiscal da empresa está incompleta.";
    throw new AppError(400, message, {
      code,
      message,
      campos: [{ campo: code.endsWith("INCOMPATIVEL") ? "cfop" : "icms", motivo: err.message }],
    });
  }
  await pool.query(
    `UPDATE tenants SET configuracoes = $2::jsonb, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1`,
    [tenantId, JSON.stringify(proximo)],
  );
  await registrarAuditoria(
    "tenants",
    tenantId,
    "CFG_FISCAL",
    {
      evento: "CONFIG_FISCAL_ALTERADA",
      regime_tributario: anterior?.regimeTributario || null,
      crt: anterior?.crt || null,
      icms_tipo: anterior?.icms?.tipo || null,
      icms_codigo: anterior?.icms?.codigo || null,
      uf: anterior?.ufEmitente || null,
      cfop_interno: anterior?.cfop?.vendaInterna || null,
      cfop_interestadual: anterior?.cfop?.vendaInterestadual || null,
    },
    {
      evento: "CONFIG_FISCAL_ALTERADA",
      regime_tributario: regimeTributario,
      crt: REGIMES_FISCAIS[regimeTributario].crt,
      icms_tipo: proximo.fiscal.icms.tipo,
      icms_codigo: proximo.fiscal.icms.codigo_padrao,
      uf: proximo.fiscal.uf,
      cfop_interno: proximo.fiscal.cfop.venda_interna,
      cfop_interestadual: proximo.fiscal.cfop.venda_interestadual,
      tenant_id: tenantId,
    },
    String(usuario || "sistema"),
  );
  return configFiscalDe(proximo, { singleTenant: false });
}
