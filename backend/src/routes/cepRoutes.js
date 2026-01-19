import express from "express";

import { buscarCep } from "../controllers/cepController.js";

const router = express.Router();

/**
 * @route   GET /api/cep/:cep
 * @desc    Busca endereço por CEP
 * @access  Public
 */
router.get("/:cep", buscarCep);

export default router;
