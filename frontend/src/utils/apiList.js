/**
 * Normaliza respostas de listagem da API (array legado ou { data, pagination }).
 */
export function unwrapListResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

export function unwrapPagination(payload) {
  if (payload?.pagination) return payload.pagination;
  return null;
}
