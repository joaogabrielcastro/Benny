import express from "express";
import billingController from "../controllers/billingController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { ROLES } from "../config/roles.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();
const adminOnly = requireRole(ROLES.ADMIN);

router.get("/plans", ah(billingController, "listPlans"));

router.get(
  "/subscription",
  requireAuth,
  adminOnly,
  ah(billingController, "getSubscription"),
);

router.post("/checkout", optionalAuth, ah(billingController, "checkout"));

router.post(
  "/portal",
  requireAuth,
  adminOnly,
  ah(billingController, "portal"),
);

export default router;
