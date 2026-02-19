/**
 * Rotas para gerenciar Tenants
 */

import express from "express";
import tenantsController from "../controllers/tenantsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Rotas públicas (sem autenticação - para criação inicial)
router.post("/tenants", tenantsController.criar);
router.get("/tenants/slug/:slug", tenantsController.buscarPorSlug);

// Rotas protegidas (necessitam JWT)
router.get(
  "/tenants/current",
  authMiddleware.authenticate.bind(authMiddleware),
  tenantsController.obterAtual,
);

router.get(
  "/tenants/current/stats",
  authMiddleware.authenticate.bind(authMiddleware),
  tenantsController.estatisticas,
);

// Rotas administrativas (necessitam permissões de admin global)
// TODO: Adicionar middleware de autenticação admin
router.get("/tenants", tenantsController.listar);
router.get("/tenants/:id", tenantsController.buscarPorId);
router.put("/tenants/:id", tenantsController.atualizar);
router.post("/tenants/:id/suspend", tenantsController.suspender);
router.post("/tenants/:id/reactivate", tenantsController.reativar);
router.delete("/tenants/:id", tenantsController.deletar);
router.get("/tenants/:id/stats", tenantsController.estatisticas);

export default router;
