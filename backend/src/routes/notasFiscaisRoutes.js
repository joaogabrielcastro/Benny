import express from "express";
import notasFiscaisController from "../controllers/notasFiscaisController.js";

const router = express.Router();

router.post(
  "/gerar/:osId",
  notasFiscaisController.gerar.bind(notasFiscaisController),
);
router.post(
  "/sincronizar/os/:osId",
  notasFiscaisController.sincronizarPorOs.bind(notasFiscaisController),
);
router.get("/", notasFiscaisController.listar.bind(notasFiscaisController));
router.get("/:id", notasFiscaisController.buscar.bind(notasFiscaisController));
router.put(
  "/:id/cancelar",
  notasFiscaisController.cancelar.bind(notasFiscaisController),
);

export default router;
