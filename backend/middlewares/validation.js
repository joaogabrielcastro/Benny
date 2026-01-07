import { body, validationResult } from "express-validator";

// Middleware de validação para criar produto
export const validateProduto = [
  body("codigo").notEmpty().withMessage("Código é obrigatório"),
  body("nome").notEmpty().withMessage("Nome é obrigatório"),
  body("quantidade")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Quantidade inválida"),
  body("valor_venda")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Valor de venda inválido"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Middleware de validação para criar cliente
export const validateCliente = [
  body("nome").notEmpty().withMessage("Nome é obrigatório"),
  body("telefone").notEmpty().withMessage("Telefone é obrigatório"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
