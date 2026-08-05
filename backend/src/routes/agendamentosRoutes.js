import express from "express";
import agendamentosController from "../controllers/agendamentosController.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import { idParamSchema } from "../schemas/commonSchemas.js";
import {
  createAgendamentoSchema,
  updateAgendamentoSchema,
} from "../schemas/agendamentoSchemas.js";

const router = express.Router();
const adminOnly = requireRole(ROLES.ADMIN);

router.get("/hoje/lista", ah(agendamentosController, "hojeLista"));
router.get("/", paginate, ah(agendamentosController, "listar"));
router.get(
  "/:id",
  validate(idParamSchema, "params"),
  ah(agendamentosController, "buscar"),
);
router.post(
  "/",
  adminOnly,
  validate(createAgendamentoSchema),
  ah(agendamentosController, "criar"),
);
router.put(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateAgendamentoSchema),
  ah(agendamentosController, "atualizar"),
);
router.delete(
  "/:id",
  adminOnly,
  validate(idParamSchema, "params"),
  ah(agendamentosController, "deletar"),
);

export default router;
