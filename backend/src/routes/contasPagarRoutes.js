import express from "express";
import contasPagarController from "../controllers/contasPagarController.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import { idParamSchema } from "../schemas/commonSchemas.js";
import {
  createContaPagarSchema,
  updateContaPagarSchema,
} from "../schemas/contaPagarSchemas.js";

const router = express.Router();

router.get("/alertas/resumo", ah(contasPagarController, "alertasResumo"));
router.get("/", paginate, ah(contasPagarController, "listar"));
router.get(
  "/:id",
  validate(idParamSchema, "params"),
  ah(contasPagarController, "buscar"),
);
router.post(
  "/",
  validate(createContaPagarSchema),
  ah(contasPagarController, "criar"),
);
router.put(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateContaPagarSchema),
  ah(contasPagarController, "atualizar"),
);
router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  ah(contasPagarController, "deletar"),
);

export default router;
