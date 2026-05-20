import express from "express";
import produtosController from "../controllers/produtosController.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import {
  createProdutoSchema,
  updateProdutoSchema,
} from "../schemas/produtoSchemas.js";

const router = express.Router();

router.get("/", paginate, ah(produtosController, "listar"));
router.get("/alertas/estoque-baixo", ah(produtosController, "estoqueBaixo"));
router.get("/diagnostico/verificar", ah(produtosController, "diagnostico"));
router.get("/:id", ah(produtosController, "buscar"));
router.post(
  "/",
  validate(createProdutoSchema),
  ah(produtosController, "criar"),
);
router.put(
  "/:id",
  validate(updateProdutoSchema),
  ah(produtosController, "atualizar"),
);
router.delete("/:id", ah(produtosController, "deletar"));

export default router;
