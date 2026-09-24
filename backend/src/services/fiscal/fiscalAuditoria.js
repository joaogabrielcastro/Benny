import { registrarAuditoria } from "../../utils/auditoria.js";

/**
 * A coluna auditoria.acao é VARCHAR(20). Os nomes longos
 * (NFSE_EMISSAO_SOLICITADA) não cabem nela e ficam em dados_novos.evento.
 * Não grava token, certificado nem payload do provedor.
 */
const ACAO_CURTA = {
  NFSE_EMISSAO_SOLICITADA: "NFSE_SOLICITADA",
  NFSE_AUTORIZADA: "NFSE_AUTORIZADA",
  NFSE_REJEITADA: "NFSE_REJEITADA",
  NFSE_CANCELADA: "NFSE_CANCELADA",
  NFE_EMISSAO_SOLICITADA: "NFE_SOLICITADA",
  NFE_AUTORIZADA: "NFE_AUTORIZADA",
  NFE_REJEITADA: "NFE_REJEITADA",
  NFE_CANCELADA: "NFE_CANCELADA",
};

export function eventoFiscalPorStatus(modelo, status) {
  const prefixo = modelo === "NFE" ? "NFE" : "NFSE";
  if (status === "autorizada") return `${prefixo}_AUTORIZADA`;
  if (status === "rejeitada" || status === "erro_autenticacao") return `${prefixo}_REJEITADA`;
  if (status === "cancelada") return `${prefixo}_CANCELADA`;
  return `${prefixo}_EMISSAO_SOLICITADA`;
}

export async function registrarEventoFiscal(
  {
    tenantId,
    usuarioId = null,
    ordemServicoId,
    notaFiscalId,
    modelo,
    provedor,
    evento,
    status = null,
  },
  client,
) {
  if (!notaFiscalId || !evento) return;
  const acao = ACAO_CURTA[evento] || "FISCAL";
  await registrarAuditoria(
    "notas_fiscais",
    notaFiscalId,
    acao,
    null,
    {
      evento,
      tenant_id: tenantId,
      usuario_id: usuarioId,
      ordem_servico_id: ordemServicoId ?? null,
      nota_fiscal_id: notaFiscalId,
      modelo: modelo || null,
      provedor: provedor || null,
      status,
    },
    usuarioId != null ? String(usuarioId) : "sistema",
    client,
  );
}
