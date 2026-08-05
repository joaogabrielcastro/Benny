import express from "express";
import lembretesController from "../controllers/lembretesController.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import { idParamSchema } from "../schemas/commonSchemas.js";

const router = express.Router();

router.get("/hoje", ah(lembretesController, "hoje"));
router.get("/", paginate, ah(lembretesController, "listar"));
router.put(
  "/:id/enviado",
  validate(idParamSchema, "params"),
  ah(lembretesController, "marcarEnviado"),
);
// Alias legado (frontend antigo usava /marcar-enviado)
router.put(
  "/:id/marcar-enviado",
  validate(idParamSchema, "params"),
  ah(lembretesController, "marcarEnviado"),
);

export default router;
