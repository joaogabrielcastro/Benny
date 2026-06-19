import express from "express";
import usuariosController from "../controllers/usuariosController.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import {
  createUsuarioSchema,
  updateUsuarioSchema,
} from "../schemas/usuarioSchemas.js";
import { idParamSchema } from "../schemas/commonSchemas.js";

const router = express.Router();

router.get("/", ah(usuariosController, "listar"));
router.get("/:id", validate(idParamSchema, "params"), ah(usuariosController, "buscar"));
router.post("/", validate(createUsuarioSchema), ah(usuariosController, "criar"));
router.put(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateUsuarioSchema),
  ah(usuariosController, "atualizar"),
);

export default router;
