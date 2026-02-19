/**
 * Rotas de Autenticação
 */

import express from "express";
import authController from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// ROTAS PÚBLICAS (sem autenticação)
// ==========================================

// Login
router.post("/login", authController.login);

// ==========================================
// ROTAS PROTEGIDAS (necessitam JWT)
// ==========================================

// Dados do usuário autenticado
router.get(
  "/me",
  authMiddleware.authenticate.bind(authMiddleware),
  authController.me,
);

// Alterar senha
router.post(
  "/alterar-senha",
  authMiddleware.authenticate.bind(authMiddleware),
  authController.alterarSenha,
);

// ==========================================
// ROTAS ADMIN (apenas administradores)
// ==========================================

// Criar usuário
router.post(
  "/usuarios",
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(["admin"]),
  authController.criarUsuario,
);

// Listar usuários
router.get(
  "/usuarios",
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(["admin"]),
  authController.listarUsuarios,
);

// Desativar usuário
router.patch(
  "/usuarios/:id/desativar",
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(["admin"]),
  authController.desativarUsuario,
);

// Reativar usuário
router.patch(
  "/usuarios/:id/reativar",
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireRole(["admin"]),
  authController.reativarUsuario,
);

export default router;
