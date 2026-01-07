import express from "express";
import sistemaRoutes from "./sistema.js";
import produtosRoutes from "./produtos.js";

const router = express.Router();

// Rotas do sistema
router.use("/", sistemaRoutes);

// Rotas de recursos
router.use("/produtos", produtosRoutes);

export default router;
