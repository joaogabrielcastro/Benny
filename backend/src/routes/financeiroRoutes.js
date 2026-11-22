import express from "express";
import { paginate } from "../middleware/paginate.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { resolveTenantId } from "../config/singleTenant.js";
import { sendPaginated } from "../lib/paginationResponse.js";
import pagamentosOsService, { FORMAS_PAGAMENTO } from "../services/pagamentosOsService.js";

const router = express.Router();
const dataOk = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

router.get("/formas-pagamento", (_req, res) => {
  res.json(FORMAS_PAGAMENTO);
});

router.get(
  "/resumo",
  asyncHandler(async (req, res) => {
    res.json(
      await pagamentosOsService.resumoFinanceiro(resolveTenantId(req), {
        data_inicio: dataOk(req.query.data_inicio),
        data_fim: dataOk(req.query.data_fim),
      }),
    );
  }),
);

router.get(
  "/receber",
  paginate,
  asyncHandler(async (req, res) => {
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await pagamentosOsService.listarReceber(resolveTenantId(req), {
      status: req.query.status,
      busca: typeof req.query.busca === "string" ? req.query.busca.trim() : undefined,
      data_inicio: dataOk(req.query.data_inicio),
      data_fim: dataOk(req.query.data_fim),
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }),
);

export default router;
