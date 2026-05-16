import express from "express";
import ordensServicoController from "../controllers/ordensServicoController.js";

const router = express.Router();

router.get("/", ordensServicoController.listar.bind(ordensServicoController));
router.get(
  "/:id",
  ordensServicoController.buscar.bind(ordensServicoController),
);
router.post("/", ordensServicoController.criar.bind(ordensServicoController));
router.put(
  "/:id",
  ordensServicoController.atualizar.bind(ordensServicoController),
);
router.delete(
  "/:id",
  ordensServicoController.deletar.bind(ordensServicoController),
);

export default router;
