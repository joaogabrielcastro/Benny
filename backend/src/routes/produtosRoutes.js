import express from "express";
import produtosController from "../controllers/produtosController.js";
import { paginate } from "../middleware/paginate.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

const validateProduto = [
  body("nome").notEmpty().withMessage("Nome é obrigatório"),
  body("codigo").optional().isString(),
  body("quantidade")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Quantidade inválida"),
  body("valor_venda")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Valor de venda inválido"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    next();
  },
];

router.get("/", paginate, produtosController.listar.bind(produtosController));
router.get(
  "/alertas/estoque-baixo",
  produtosController.estoqueBaixo.bind(produtosController),
);
router.get(
  "/diagnostico/verificar",
  produtosController.diagnostico.bind(produtosController),
);
router.get("/:id", produtosController.buscar.bind(produtosController));
router.post(
  "/",
  validateProduto,
  produtosController.criar.bind(produtosController),
);
router.put("/:id", produtosController.atualizar.bind(produtosController));
router.delete("/:id", produtosController.deletar.bind(produtosController));

export default router;
