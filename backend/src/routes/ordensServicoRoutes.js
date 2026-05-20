import express from "express";
import ordensServicoController from "../controllers/ordensServicoController.js";
import { paginate } from "../middleware/paginate.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();

router.get("/", paginate, ah(ordensServicoController, "listar"));
router.get("/:id", ah(ordensServicoController, "buscar"));
router.post("/", ah(ordensServicoController, "criar"));
router.put("/:id", ah(ordensServicoController, "atualizar"));
router.delete("/:id", ah(ordensServicoController, "deletar"));

export default router;
