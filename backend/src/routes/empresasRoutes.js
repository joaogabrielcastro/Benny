import express from "express";
import empresasController from "../controllers/empresasController.js";

const router = express.Router();

router.post("/", (req, res) => empresasController.criar(req, res));
router.get("/", (req, res) => empresasController.listar(req, res));
router.get("/:id", (req, res) => empresasController.buscar(req, res));

export default router;
