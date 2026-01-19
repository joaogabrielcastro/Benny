import express from "express";
import gatewayController from "../controllers/gatewayController.js";

const router = express.Router();

router.post("/", (req, res) => gatewayController.criar(req, res));
router.get("/", (req, res) => gatewayController.listar(req, res));
router.get("/:id", (req, res) => gatewayController.buscar(req, res));
router.delete("/:id", (req, res) => gatewayController.deletar(req, res));
router.get("/:id/certificado", (req, res) => gatewayController.baixarCertificado(req, res));

export default router;
