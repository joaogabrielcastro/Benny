import express from "express";
import servicosController from "../controllers/servicosController.js";

const router = express.Router();

router.get("/", servicosController.listar.bind(servicosController));
router.get("/:id", servicosController.buscar.bind(servicosController));
router.post("/", servicosController.criar.bind(servicosController));
router.put("/:id", servicosController.atualizar.bind(servicosController));
router.delete("/:id", servicosController.deletar.bind(servicosController));

export default router;
