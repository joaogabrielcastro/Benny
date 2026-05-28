import express from "express";
import servicosController from "../controllers/servicosController.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import {
  createServicoSchema,
  updateServicoSchema,
} from "../schemas/servicoSchemas.js";

const router = express.Router();
const adminOnly = requireRole(ROLES.ADMIN);

router.get("/", paginate, ah(servicosController, "listar"));
router.get("/:id", ah(servicosController, "buscar"));
router.post(
  "/",
  adminOnly,
  validate(createServicoSchema),
  ah(servicosController, "criar"),
);
router.put(
  "/:id",
  adminOnly,
  validate(updateServicoSchema),
  ah(servicosController, "atualizar"),
);
router.delete("/:id", adminOnly, ah(servicosController, "deletar"));

export default router;
