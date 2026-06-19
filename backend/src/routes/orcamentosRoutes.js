import express from "express";
import rateLimit from "express-rate-limit";
import orcamentosController from "../controllers/orcamentosController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import {
  createOrcamentoSchema,
  updateOrcamentoSchema,
  orcamentoTokenParamSchema,
} from "../schemas/comercialSchemas.js";
import { idParamSchema } from "../schemas/commonSchemas.js";

const router = express.Router();

const publicOrcamentoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas requisições. Tente novamente em alguns minutos.",
  },
});

router.get(
  "/v/:token",
  publicOrcamentoLimiter,
  validate(orcamentoTokenParamSchema, "params"),
  ah(orcamentosController, "buscarPublico"),
);
router.put(
  "/v/:token/aprovar",
  publicOrcamentoLimiter,
  validate(orcamentoTokenParamSchema, "params"),
  ah(orcamentosController, "aprovarPublico"),
);
router.put(
  "/v/:token/reprovar",
  publicOrcamentoLimiter,
  validate(orcamentoTokenParamSchema, "params"),
  ah(orcamentosController, "reprovarPublico"),
);

const adminOnly = requireRole(ROLES.ADMIN);

router.get("/", requireAuth, adminOnly, paginate, ah(orcamentosController, "listar"));
router.get(
  "/:id",
  requireAuth,
  adminOnly,
  validate(idParamSchema, "params"),
  ah(orcamentosController, "buscar"),
);
router.post(
  "/",
  requireAuth,
  adminOnly,
  validate(createOrcamentoSchema),
  ah(orcamentosController, "criar"),
);
router.put(
  "/:id",
  requireAuth,
  adminOnly,
  validate(idParamSchema, "params"),
  validate(updateOrcamentoSchema),
  ah(orcamentosController, "atualizar"),
);
router.post(
  "/:id/converter-os",
  requireAuth,
  adminOnly,
  validate(idParamSchema, "params"),
  ah(orcamentosController, "converterEmOS"),
);
router.delete(
  "/:id",
  requireAuth,
  adminOnly,
  validate(idParamSchema, "params"),
  ah(orcamentosController, "deletar"),
);

export default router;
