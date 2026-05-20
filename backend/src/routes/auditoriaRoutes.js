import express from "express";
import auditoriaController from "../controllers/auditoriaController.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();

router.get(
  "/ordens-servico/:id",
  ah(auditoriaController, "buscarPorOS"),
);
router.get(
  "/orcamentos/:id",
  ah(auditoriaController, "buscarPorOrcamento"),
);

export default router;
