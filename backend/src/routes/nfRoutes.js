import express from "express";
import nfController from "../controllers/nfController.js";

const router = express.Router();

/**
 * @route   POST /api/notas-fiscais/gerar/:osId
 * @desc    Gera uma Nota Fiscal para uma OS
 * @access  Private
 */
router.post("/gerar/:osId", nfController.gerarNF);

/**
 * @route   GET /api/notas-fiscais/:id
 * @desc    Busca uma Nota Fiscal por ID
 * @access  Private
 */
router.get("/:id", nfController.buscarNF);

/**
 * @route   GET /api/notas-fiscais
 * @desc    Lista todas as Notas Fiscais
 * @access  Private
 */
router.get("/", nfController.listarNFs);

/**
 * @route   PUT /api/notas-fiscais/:id/cancelar
 * @desc    Cancela uma Nota Fiscal
 * @access  Private
 */
router.put("/:id/cancelar", nfController.cancelarNF);

export default router;
