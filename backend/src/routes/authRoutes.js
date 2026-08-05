import express from "express";
import rateLimit from "express-rate-limit";
import authController from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import { loginSchema } from "../schemas/authSchemas.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  },
});

router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  ah(authController, "login"),
);
router.post("/logout", ah(authController, "logout"));
router.get("/me", requireAuth, ah(authController, "me"));

export default router;
