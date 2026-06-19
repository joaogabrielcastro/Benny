import express from "express";
import agendamentosController from "../controllers/agendamentosController.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";
import { paginate } from "../middleware/paginate.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();
const adminOnly = requireRole(ROLES.ADMIN);

router.get("/hoje/lista", ah(agendamentosController, "hojeLista"));
router.get("/", paginate, ah(agendamentosController, "listar"));
router.get("/:id", ah(agendamentosController, "buscar"));
router.post("/", adminOnly, ah(agendamentosController, "criar"));
router.put("/:id", ah(agendamentosController, "atualizar"));
router.delete("/:id", adminOnly, ah(agendamentosController, "deletar"));

export default router;
