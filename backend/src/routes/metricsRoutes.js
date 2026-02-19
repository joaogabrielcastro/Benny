/**
 * Rotas de Métricas
 */

import express from "express";
import metricsController from "../controllers/metricsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware.authenticate.bind(authMiddleware));

// ==========================================
// ROTAS DO TENANT
// ==========================================

// Dashboard principal
router.get("/dashboard", metricsController.dashboard);

// Uso de limites do plano
router.get("/limits", metricsController.limits);

// ==========================================
// ROTAS ADMIN GLOBAL
// TODO: Criar middleware para super admin
// ==========================================

// Métricas gerais do SaaS
router.get("/admin", metricsController.adminMetrics);

// Ranking de tenants
router.get("/admin/top-tenants", metricsController.topTenants);

// Tenants em risco de churn
router.get("/admin/churn-risk", metricsController.churnRisk);

// Crescimento mensal
router.get("/admin/growth", metricsController.growth);

export default router;
