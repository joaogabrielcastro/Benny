import express from "express";
import auditoriaController from "../controllers/auditoriaController.js";

const router = express.Router();

router.get(
  "/ordens-servico/:id",
  auditoriaController.buscarPorOS.bind(auditoriaController),
);
router.get(
  "/orcamentos/:id",
  auditoriaController.buscarPorOrcamento.bind(auditoriaController),
);

export default router;
