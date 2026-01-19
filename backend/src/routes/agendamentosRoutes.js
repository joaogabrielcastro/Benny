import express from "express";
import agendamentosController from "../controllers/agendamentosController.js";

const router = express.Router();

router.get("/", agendamentosController.listar.bind(agendamentosController));
router.get(
  "/hoje/lista",
  agendamentosController.hojeLista.bind(agendamentosController),
);
router.get("/:id", agendamentosController.buscar.bind(agendamentosController));
router.post("/", agendamentosController.criar.bind(agendamentosController));
router.put(
  "/:id",
  agendamentosController.atualizar.bind(agendamentosController),
);
router.delete(
  "/:id",
  agendamentosController.deletar.bind(agendamentosController),
);

export default router;
