export function sendPaginated(res, { rows, total, page, limit }) {
  const pages = limit > 0 ? Math.ceil(total / limit) : 1;
  res.json({
    data: rows,
    pagination: { page, limit, total, pages },
  });
}
