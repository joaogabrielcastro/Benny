import express from "express";

// Autenticação
import authRoutes from "./authRoutes.js";
import { requireAuth } from "../middleware/authMiddleware.js";

// Utilitários e infraestrutura
import cepRoutes from "./cepRoutes.js";
import nfRoutes from "./nfRoutes.js";
import empresasRoutes from "./empresasRoutes.js";

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

const router = express.Router();

// ── Públicas (sem autenticação) ───────────────────────────────────────────────
router.use("/auth", authRoutes);
router.use("/cep", cepRoutes);

// Rotas de orçamento: as /v/:token são públicas (handled inside orcamentosRoutes)
router.use("/orcamentos", orcamentosRoutes);

// ── Recursos protegidos ───────────────────────────────────────────────────────
router.use("/produtos", requireAuth, produtosRoutes);
router.use("/servicos", requireAuth, servicosRoutes);
router.use("/clientes", requireAuth, clientesRoutes);
router.use("/veiculos", requireAuth, veiculosRoutes);
router.use("/ordens-servico", requireAuth, ordensServicoRoutes);
router.use("/agendamentos", requireAuth, agendamentosRoutes);
router.use("/contas-pagar", requireAuth, contasPagarRoutes);
router.use("/lembretes", requireAuth, lembretesRoutes);
router.use("/relatorios", requireAuth, relatoriosRoutes);
router.use("/auditoria", requireAuth, auditoriaRoutes);
router.use("/backup", requireAuth, backupRoutes);

// ── NF e Empresas ─────────────────────────────────────────────────────────────
router.use("/notas-fiscais", requireAuth, nfRoutes);
router.use("/empresas", requireAuth, empresasRoutes);

export default router;
