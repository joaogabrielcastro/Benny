import express from "express";
import ordensServicoController from "../controllers/ordensServicoController.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import {
  createOrdemServicoSchema,
  updateOrdemServicoSchema,
  pagamentoOsSchema,
  updatePagamentoOsSchema,
} from "../schemas/comercialSchemas.js";
import { z } from "zod";
import { idParamSchema } from "../schemas/commonSchemas.js";

const router = express.Router();
const adminOnly = requireRole(ROLES.ADMIN);

router.get("/", paginate, ah(ordensServicoController, "listar"));
router.get(
  "/:id",
  validate(idParamSchema, "params"),
  ah(ordensServicoController, "buscar"),
);
router.post(
  "/",
  adminOnly,
  validate(createOrdemServicoSchema),
  ah(ordensServicoController, "criar"),
);
router.put(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateOrdemServicoSchema),
  ah(ordensServicoController, "atualizar"),
);
// Pagamentos da OS (financeiro: somente admin)
const pagamentoParams = z.object({
  id: z.coerce.number().int().positive(),
  pagamentoId: z.coerce.number().int().positive(),
});
router.get(
  "/:id/pagamentos",
  adminOnly,
  validate(idParamSchema, "params"),
  ah(ordensServicoController, "listarPagamentos"),
);
router.post(
  "/:id/pagamentos",
  adminOnly,
  validate(idParamSchema, "params"),
  validate(pagamentoOsSchema),
  ah(ordensServicoController, "registrarPagamento"),
);
router.put(
  "/:id/pagamentos/:pagamentoId",
  adminOnly,
  validate(pagamentoParams, "params"),
  validate(updatePagamentoOsSchema),
  ah(ordensServicoController, "atualizarPagamento"),
);
router.delete(
  "/:id/pagamentos/:pagamentoId",
  adminOnly,
  validate(pagamentoParams, "params"),
  ah(ordensServicoController, "removerPagamento"),
);

router.delete(
  "/:id",
  adminOnly,
  validate(idParamSchema, "params"),
  ah(ordensServicoController, "deletar"),
);

export default router;
