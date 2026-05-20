/**
 * Encapsula handlers async do Express e repassa erros ao middleware de erro.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
