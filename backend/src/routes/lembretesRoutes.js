import express from "express";
import lembretesController from "../controllers/lembretesController.js";
import { paginate } from "../middleware/paginate.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();

router.get("/hoje", ah(lembretesController, "hoje"));
router.get("/", paginate, ah(lembretesController, "listar"));
router.put("/:id/enviado", ah(lembretesController, "marcarEnviado"));

export default router;
