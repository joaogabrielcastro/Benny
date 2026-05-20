/**
 * Middleware de paginação.
 * Injeta req.pagination = { limit, offset, page } em cada requisição.
 *
 * Observação: parseInt(undefined) é NaN; NaN || 20 virava 20 e ignorava ?limit=50000 em alguns ambientes.
 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 500;

export const paginate = (req, res, next) => {
  const pageRaw = Array.isArray(req.query.page)
    ? req.query.page[0]
    : req.query.page;
  const limitRaw = Array.isArray(req.query.limit)
    ? req.query.limit[0]
    : req.query.limit;

  let page = parseInt(String(pageRaw ?? "1"), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let limit = parseInt(String(limitRaw ?? ""), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;
  req.pagination = { limit, offset, page };
  next();
};
