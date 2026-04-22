import express from "express";
import clientesController from "../controllers/clientesController.js";

const router = express.Router();

router.get("/", clientesController.listar.bind(clientesController));
router.get("/:id", clientesController.buscar.bind(clientesController));
router.post("/", clientesController.criar.bind(clientesController));
router.put("/:id", clientesController.atualizar.bind(clientesController));

export default router;
