import express from "express";
import * as sistemaController from "../controllers/sistemaController.js";

const router = express.Router();

router.get("/health", sistemaController.healthCheck);

export default router;
