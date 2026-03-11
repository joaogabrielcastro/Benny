import express from "express";
import orcamentosController from "../controllers/orcamentosController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Rotas públicas (sem autenticação) — token no path
router.get(
  "/v/:token",
  orcamentosController.buscarPublico.bind(orcamentosController),
);
router.put(
  "/v/:token/aprovar",
  orcamentosController.aprovarPublico.bind(orcamentosController),
);
router.put(
  "/v/:token/reprovar",
  orcamentosController.reprovarPublico.bind(orcamentosController),
);

// Rotas autenticadas
router.get(
  "/",
  requireAuth,
  orcamentosController.listar.bind(orcamentosController),
);
router.get(
  "/:id",
  requireAuth,
  orcamentosController.buscar.bind(orcamentosController),
);
router.post(
  "/",
  requireAuth,
  orcamentosController.criar.bind(orcamentosController),
);
router.put(
  "/:id",
  requireAuth,
  orcamentosController.atualizar.bind(orcamentosController),
);
router.post(
  "/:id/converter-os",
  requireAuth,
  orcamentosController.converterEmOS.bind(orcamentosController),
);

export default router;
