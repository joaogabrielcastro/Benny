import express from "express";
import cepRoutes from "./cepRoutes.js";
import nfRoutes from "./nfRoutes.js";
import agendamentosRoutes from "./agendamentosRoutes.js";
import contasPagarRoutes from "./contasPagarRoutes.js";
import lembretesRoutes from "./lembretesRoutes.js";
import empresasRoutes from "./empresasRoutes.js";
import gatewayRoutes from "./gatewayRoutes.js";

const router = express.Router();

// Rotas de CEP
router.use("/cep", cepRoutes);

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
