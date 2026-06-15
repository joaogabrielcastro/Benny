import cepService from "../services/cepService.js";

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

/**
 * Resolve código IBGE (7 dígitos) do município do cliente a partir do CEP (ViaCEP).
 */
export async function resolveCodigoIbgeCliente(cep, codigoIbgeInformado) {
  const informado = onlyDigits(codigoIbgeInformado);
  if (informado.length === 7) return informado;

  const cepLimpo = onlyDigits(cep);
  if (cepLimpo.length !== 8) return null;

  try {
    const end = await cepService.buscarEnderecoPorCep(cepLimpo);
    const ibge = onlyDigits(end?.ibge);
    return ibge.length === 7 ? ibge : null;
  } catch {
    return null;
  }
}
