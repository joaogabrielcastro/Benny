import express from "express";
import relatoriosController from "../controllers/relatoriosController.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();

router.get("/dashboard", ah(relatoriosController, "dashboard"));
router.get("/vendas", ah(relatoriosController, "vendas"));

export default router;
