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
} from "../schemas/comercialSchemas.js";
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
router.delete(
  "/:id",
  adminOnly,
  validate(idParamSchema, "params"),
  ah(ordensServicoController, "deletar"),
);

export default router;
