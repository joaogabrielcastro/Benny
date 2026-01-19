import express from "express";
import contasPagarController from "../controllers/contasPagarController.js";

const router = express.Router();

router.get("/", contasPagarController.listar.bind(contasPagarController));
router.get(
  "/alertas/resumo",
  contasPagarController.alertasResumo.bind(contasPagarController),
);
router.get("/:id", contasPagarController.buscar.bind(contasPagarController));
router.post("/", contasPagarController.criar.bind(contasPagarController));
router.put("/:id", contasPagarController.atualizar.bind(contasPagarController));
router.delete(
  "/:id",
  contasPagarController.deletar.bind(contasPagarController),
);

export default router;
