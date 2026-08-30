import express from "express";
import relatoriosController from "../controllers/relatoriosController.js";
import { ah } from "../lib/routeUtils.js";
import { validate } from "../lib/validate.js";
import { fechamentoMensalQuerySchema } from "../schemas/fechamentoMensalSchemas.js";

const router = express.Router();

router.get("/dashboard", ah(relatoriosController, "dashboard"));
router.get("/vendas", ah(relatoriosController, "vendas"));
router.get(
  "/fechamento-mensal",
  validate(fechamentoMensalQuerySchema, "query"),
  ah(relatoriosController, "fechamentoMensal"),
);
router.get(
  "/fechamento-mensal/export",
  validate(fechamentoMensalQuerySchema, "query"),
  ah(relatoriosController, "exportarFechamentoMensal"),
);

export default router;
