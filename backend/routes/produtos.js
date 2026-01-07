import express from "express";
import * as produtosController from "../controllers/produtosController.js";
import { cacheMiddleware } from "../middlewares/cache.js";
import { paginate } from "../middlewares/pagination.js";
import { validateProduto } from "../middlewares/validation.js";

const router = express.Router();

router.get(
  "/",
  paginate,
  cacheMiddleware(300),
  produtosController.listarProdutos
);
router.get("/alertas/estoque-baixo", produtosController.produtosEstoqueBaixo);
router.get("/:id", produtosController.buscarProduto);
router.post("/", validateProduto, produtosController.criarProduto);
router.put("/:id", produtosController.atualizarProduto);
router.delete("/:id", produtosController.deletarProduto);

export default router;
