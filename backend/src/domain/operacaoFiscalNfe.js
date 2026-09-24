/**
 * indFinal da NF-e: 0 operação normal, 1 consumidor final.
 * A Brasil NFe representa isso como ConsumidorFinal boolean.
 * O contrato publicado não documenta o grupo ICMSUFDest.
 */

function erro(code, message, motivo, campo) {
  return {
    ok: false,
    code,
    message,
    campos: [{ campo, motivo }],
  };
}

export function validarConsumidorFinalOperacao({
  consumidorFinal,
  ufEmitente,
  ufDestino,
  indicadorIe,
}) {
  if (consumidorFinal !== true && consumidorFinal !== false) {
    return erro(
      "NFE_OPERACAO_FISCAL_INCOMPLETA",
      "A operação fiscal está incompleta.",
      "Informe se esta operação é destinada a consumidor final.",
      "consumidor_final",
    );
  }
  const emitente = String(ufEmitente || "").trim().toUpperCase();
  const destino = String(ufDestino || "").trim().toUpperCase();
  const interestadual = Boolean(emitente && destino && emitente !== destino);
  if (interestadual && consumidorFinal === true && Number(indicadorIe) === 9) {
    return erro(
      "NFE_ICMS_UF_DESTINO_NAO_CONFIGURADO",
      "Esta operação interestadual para consumidor final não contribuinte exige configuração fiscal adicional para o ICMS da UF de destino.",
      "ICMS da UF de destino ainda não está configurado.",
      "icms_uf_destino",
    );
  }
  return { ok: true, consumidorFinal };
}
