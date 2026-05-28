import express from "express";
import produtosController from "../controllers/produtosController.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import {
  createProdutoSchema,
  updateProdutoSchema,
} from "../schemas/produtoSchemas.js";

const router = express.Router();
const adminOnly = requireRole(ROLES.ADMIN);

router.get("/", paginate, ah(produtosController, "listar"));
router.get("/alertas/estoque-baixo", ah(produtosController, "estoqueBaixo"));
router.get("/diagnostico/verificar", adminOnly, ah(produtosController, "diagnostico"));
router.get("/:id", ah(produtosController, "buscar"));
router.post(
  "/",
  adminOnly,
  validate(createProdutoSchema),
  ah(produtosController, "criar"),
);
router.put(
  "/:id",
  adminOnly,
  validate(updateProdutoSchema),
  ah(produtosController, "atualizar"),
);
router.delete("/:id", adminOnly, ah(produtosController, "deletar"));

export default router;
