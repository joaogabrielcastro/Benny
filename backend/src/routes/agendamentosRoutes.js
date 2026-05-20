import express from "express";
import agendamentosController from "../controllers/agendamentosController.js";
import { paginate } from "../middleware/paginate.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();

router.get("/hoje/lista", ah(agendamentosController, "hojeLista"));
router.get("/", paginate, ah(agendamentosController, "listar"));
router.get("/:id", ah(agendamentosController, "buscar"));
router.post("/", ah(agendamentosController, "criar"));
router.put("/:id", ah(agendamentosController, "atualizar"));
router.delete("/:id", ah(agendamentosController, "deletar"));

export default router;
