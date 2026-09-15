/**
 * Transições de status da OS alinhadas ao domínio operacional (UI + backend).
 *
 * Permitido:
 *   Aberta        → Em andamento | Cancelada
 *   Em andamento  → Finalizada | Cancelada
 *   Finalizada    → (terminal)
 *   Cancelada     → (terminal)
 *
 * Manter o mesmo status (ex.: atualizar km) é sempre permitido.
 */
export const OS_STATUS = Object.freeze([
  "Aberta",
  "Em andamento",
  "Finalizada",
  "Cancelada",
]);

export const OS_TRANSICOES = Object.freeze({
  Aberta: Object.freeze(["Em andamento", "Cancelada"]),
  "Em andamento": Object.freeze(["Finalizada", "Cancelada"]),
  Finalizada: Object.freeze([]),
  Cancelada: Object.freeze([]),
});

export function podeTransicionarStatusOs(de, para) {
  if (de == null || para == null) return false;
  if (de === para) return true;
  const destinos = OS_TRANSICOES[de];
  if (!destinos) return false;
  return destinos.includes(para);
}

export function assertTransicaoStatusOs(de, para) {
  if (podeTransicionarStatusOs(de, para)) return;
  const err = new Error(
    `Transição de status inválida: "${de}" → "${para}"`,
  );
  err.code = "STATUS_TRANSITION_INVALID";
  throw err;
}
