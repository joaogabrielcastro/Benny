import { Router } from "express";
import { ah } from "../lib/routeUtils.js";
import { validate } from "../lib/validate.js";
import configFiscalController from "../controllers/configFiscalController.js";
import { atualizarConfigFiscalSchema } from "../schemas/configFiscalSchemas.js";

const router = Router();

router.get("/", ah(configFiscalController, "obter"));
router.put(
  "/",
  validate(atualizarConfigFiscalSchema),
  ah(configFiscalController, "atualizar"),
);

export default router;
