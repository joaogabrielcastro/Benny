import express from "express";
import contasPagarController from "../controllers/contasPagarController.js";
import { paginate } from "../middleware/paginate.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();

router.get(
  "/alertas/resumo",
  ah(contasPagarController, "alertasResumo"),
);
router.get("/", paginate, ah(contasPagarController, "listar"));
router.get("/:id", ah(contasPagarController, "buscar"));
router.post("/", ah(contasPagarController, "criar"));
router.put("/:id", ah(contasPagarController, "atualizar"));
router.delete("/:id", ah(contasPagarController, "deletar"));

export default router;
