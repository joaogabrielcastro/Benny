import express from "express";
import authController from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/auth/registrar — cria nova oficina + admin
router.post("/registrar", (req, res) => authController.registrar(req, res));

// POST /api/auth/login — autentica usuário existente
router.post("/login", (req, res) => authController.login(req, res));

// GET /api/auth/me — retorna dados do usuário logado (requer token)
router.get("/me", requireAuth, (req, res) => authController.me(req, res));

export default router;
