import express from "express";
import orcamentosController from "../controllers/orcamentosController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { paginate } from "../middleware/paginate.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();

router.get("/v/:token", ah(orcamentosController, "buscarPublico"));
router.put("/v/:token/aprovar", ah(orcamentosController, "aprovarPublico"));
router.put("/v/:token/reprovar", ah(orcamentosController, "reprovarPublico"));

router.get("/", requireAuth, paginate, ah(orcamentosController, "listar"));
router.get("/:id", requireAuth, ah(orcamentosController, "buscar"));
router.post("/", requireAuth, ah(orcamentosController, "criar"));
router.put("/:id", requireAuth, ah(orcamentosController, "atualizar"));
router.post(
  "/:id/converter-os",
  requireAuth,
  ah(orcamentosController, "converterEmOS"),
);
router.delete("/:id", requireAuth, ah(orcamentosController, "deletar"));

export default router;
