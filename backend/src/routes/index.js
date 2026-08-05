import express from "express";

// Autenticação
import authRoutes from "./authRoutes.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";

// Utilitários e infraestrutura
import cepRoutes from "./cepRoutes.js";

// Recursos do sistema
import produtosRoutes from "./produtosRoutes.js";
import servicosRoutes from "./servicosRoutes.js";
import clientesRoutes from "./clientesRoutes.js";
import veiculosRoutes from "./veiculosRoutes.js";
import orcamentosRoutes from "./orcamentosRoutes.js";
import ordensServicoRoutes from "./ordensServicoRoutes.js";
import agendamentosRoutes from "./agendamentosRoutes.js";
import contasPagarRoutes from "./contasPagarRoutes.js";
import lembretesRoutes from "./lembretesRoutes.js";
import relatoriosRoutes from "./relatoriosRoutes.js";
import auditoriaRoutes from "./auditoriaRoutes.js";
import backupRoutes from "./backupRoutes.js";
import notasFiscaisRoutes from "./notasFiscaisRoutes.js";
import usuariosRoutes from "./usuariosRoutes.js";
import billingRoutes from "./billingRoutes.js";
import { requireActiveSubscription } from "../middleware/requireActiveSubscription.js";

const router = express.Router();

// ── Públicas (sem autenticação) ───────────────────────────────────────────────
router.use("/auth", authRoutes);
router.use("/cep", cepRoutes);
router.use("/billing", billingRoutes);

// Rotas de orçamento: as /v/:token são públicas (handled inside orcamentosRoutes)
router.use("/orcamentos", orcamentosRoutes);

// ── Recursos protegidos ───────────────────────────────────────────────────────
const adminOnly = requireRole(ROLES.ADMIN);
const osTeam = requireRole(ROLES.ADMIN, ROLES.MECANICO);

router.use(requireAuth, requireActiveSubscription);

router.use("/produtos", produtosRoutes);
router.use("/servicos", servicosRoutes);
router.use("/clientes", clientesRoutes);
router.use("/veiculos", veiculosRoutes);
router.use("/ordens-servico", osTeam, ordensServicoRoutes);
router.use("/agendamentos", osTeam, agendamentosRoutes);
router.use("/contas-pagar", adminOnly, contasPagarRoutes);
router.use("/lembretes", adminOnly, lembretesRoutes);
router.use("/relatorios", adminOnly, relatoriosRoutes);
router.use("/auditoria", adminOnly, auditoriaRoutes);
router.use("/backup", backupRoutes);
router.use("/notas-fiscais", adminOnly, notasFiscaisRoutes);
router.use("/usuarios", adminOnly, usuariosRoutes);

export default router;
