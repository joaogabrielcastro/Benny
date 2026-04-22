import express from "express";
import veiculosController from "../controllers/veiculosController.js";

const router = express.Router();

router.get("/", veiculosController.listar.bind(veiculosController));
router.get(
  "/cliente/:clienteId",
  veiculosController.listarPorCliente.bind(veiculosController),
);
router.post("/", veiculosController.criar.bind(veiculosController));

export default router;
