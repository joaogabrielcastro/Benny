import express from "express";
import { buscarCep } from "../controllers/cepController.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = express.Router();

router.get("/:cep", asyncHandler(buscarCep));

export default router;
