import express from "express";
import backupController from "../controllers/backupController.js";

const router = express.Router();

router.post("/", backupController.realizar.bind(backupController));
router.get("/list", backupController.listar.bind(backupController));

export default router;
