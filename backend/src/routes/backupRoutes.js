import express from "express";
import backupController from "../controllers/backupController.js";
import { requireRole } from "../middleware/requireRole.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();

router.post("/", requireRole("admin"), ah(backupController, "realizar"));
router.get("/list", requireRole("admin"), ah(backupController, "listar"));

export default router;
