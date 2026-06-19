import express from "express";
import veiculosController from "../controllers/veiculosController.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import { createVeiculoSchema } from "../schemas/veiculoSchemas.js";

const router = express.Router();

router.get(
  "/consulta-placa/:placa",
  ah(veiculosController, "consultarPlaca"),
);
router.get("/", paginate, ah(veiculosController, "listar"));
router.get(
  "/cliente/:clienteId",
  ah(veiculosController, "listarPorCliente"),
);
router.post(
  "/",
  requireRole(ROLES.ADMIN),
  validate(createVeiculoSchema),
  ah(veiculosController, "criar"),
);

export default router;
