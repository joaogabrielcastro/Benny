import express from "express";
import servicosController from "../controllers/servicosController.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import {
  createServicoSchema,
  updateServicoSchema,
} from "../schemas/servicoSchemas.js";

const router = express.Router();

router.get("/", paginate, ah(servicosController, "listar"));
router.get("/:id", ah(servicosController, "buscar"));
router.post("/", validate(createServicoSchema), ah(servicosController, "criar"));
router.put(
  "/:id",
  validate(updateServicoSchema),
  ah(servicosController, "atualizar"),
);
router.delete("/:id", ah(servicosController, "deletar"));

export default router;
