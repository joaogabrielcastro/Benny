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

const router = express.Router();

// ── Públicas (sem autenticação) ───────────────────────────────────────────────
router.use("/auth", authRoutes);
router.use("/cep", cepRoutes);

// Rotas de orçamento: as /v/:token são públicas (handled inside orcamentosRoutes)
router.use("/orcamentos", orcamentosRoutes);

// ── Recursos protegidos ───────────────────────────────────────────────────────
const adminOnly = requireRole(ROLES.ADMIN);
const osTeam = requireRole(ROLES.ADMIN, ROLES.MECANICO);

router.use("/produtos", requireAuth, produtosRoutes);
router.use("/servicos", requireAuth, servicosRoutes);
router.use("/clientes", requireAuth, clientesRoutes);
router.use("/veiculos", requireAuth, veiculosRoutes);
router.use("/ordens-servico", requireAuth, osTeam, ordensServicoRoutes);
router.use("/agendamentos", requireAuth, osTeam, agendamentosRoutes);
router.use("/contas-pagar", requireAuth, adminOnly, contasPagarRoutes);
router.use("/lembretes", requireAuth, adminOnly, lembretesRoutes);
router.use("/relatorios", requireAuth, adminOnly, relatoriosRoutes);
router.use("/auditoria", requireAuth, adminOnly, auditoriaRoutes);
router.use("/backup", requireAuth, backupRoutes);
router.use("/notas-fiscais", requireAuth, adminOnly, notasFiscaisRoutes);
router.use("/usuarios", requireAuth, adminOnly, usuariosRoutes);

export default router;
