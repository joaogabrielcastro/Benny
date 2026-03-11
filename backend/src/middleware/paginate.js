/**
 * Middleware de paginação.
 * Injeta req.pagination = { limit, offset, page } em cada requisição.
 */
export const paginate = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  req.pagination = { limit, offset, page };
  next();
};
