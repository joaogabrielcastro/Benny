import express from "express";
import relatoriosController from "../controllers/relatoriosController.js";

const router = express.Router();

router.get(
  "/dashboard",
  relatoriosController.dashboard.bind(relatoriosController),
);
router.get("/vendas", relatoriosController.vendas.bind(relatoriosController));

export default router;
