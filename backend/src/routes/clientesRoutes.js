import express from "express";
import clientesController from "../controllers/clientesController.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import {
  createClienteSchema,
  updateClienteSchema,
} from "../schemas/clienteSchemas.js";

const router = express.Router();
const adminOnly = requireRole(ROLES.ADMIN);

router.get("/", paginate, ah(clientesController, "listar"));
router.get("/:id", ah(clientesController, "buscar"));
router.post(
  "/",
  adminOnly,
  validate(createClienteSchema),
  ah(clientesController, "criar"),
);
router.put(
  "/:id",
  adminOnly,
  validate(updateClienteSchema),
  ah(clientesController, "atualizar"),
);

export default router;
