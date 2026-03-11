import express from "express";
import cepRoutes from "./cepRoutes.js";
import nfRoutes from "./nfRoutes.js";
import agendamentosRoutes from "./agendamentosRoutes.js";
import contasPagarRoutes from "./contasPagarRoutes.js";
import lembretesRoutes from "./lembretesRoutes.js";
import empresasRoutes from "./empresasRoutes.js";
import gatewayRoutes from "./gatewayRoutes.js";
import authRoutes from "./authRoutes.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ========================================
// ROTAS PÚBLICAS (sem autenticação)
// ========================================

// Rotas de CEP (pública)
router.use("/cep", cepRoutes);

// Rotas de autenticação (públicas)
router.use("/auth", authRoutes);

// ========================================
// ROTAS PROTEGIDAS (requerem autenticação)
// ========================================

// Aplicar middleware de autenticação para todas as rotas abaixo
router.use(authMiddleware.authenticate.bind(authMiddleware));

// Rotas de Notas Fiscais
router.use("/notas-fiscais", nfRoutes);

// Rotas migradas do monolito
router.use("/agendamentos", agendamentosRoutes);
router.use("/contas-pagar", contasPagarRoutes);
router.use("/lembretes", lembretesRoutes);

// Rotas para empresas (emitentes)
router.use("/empresas", empresasRoutes);

// Rotas para configuração de gateways NF
// router.use("/gateway-configs", gatewayRoutes); // Desabilitado temporariamente

// TODO: Migrar outras rotas do server.js para cá
// - produtosRoutes
// - clientesRoutes
// - veiculosRoutes
// - orcamentosRoutes
// - ordensServicoRoutes
// - agendamentosRoutes
// - contasPagarRoutes
// - lembretesRoutes

export default router;
