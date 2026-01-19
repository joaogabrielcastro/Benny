import express from "express";
import lembretesController from "../controllers/lembretesController.js";

const router = express.Router();

router.get("/", lembretesController.listar.bind(lembretesController));
router.get("/hoje", lembretesController.hoje.bind(lembretesController));
router.put("/:id/marcar-enviado", lembretesController.marcarEnviado.bind(lembretesController));

export default router;
