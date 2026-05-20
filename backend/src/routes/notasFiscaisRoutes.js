import express from "express";
import notasFiscaisController from "../controllers/notasFiscaisController.js";
import { paginate } from "../middleware/paginate.js";
import { ah } from "../lib/routeUtils.js";

const router = express.Router();

const setModelo = (modelo) => (req, _res, next) => {
  req.params.modelo = modelo;
  next();
};

router.get("/os/:osId", ah(notasFiscaisController, "listarPorOs"));
router.post("/gerar/:osId/nfse", ah(notasFiscaisController, "gerar"));
router.post(
  "/gerar/:osId/nfe",
  setModelo("nfe"),
  ah(notasFiscaisController, "gerar"),
);
router.post("/gerar/:osId", ah(notasFiscaisController, "gerar"));
router.post(
  "/sincronizar/os/:osId/nfse",
  setModelo("nfse"),
  ah(notasFiscaisController, "sincronizarPorOs"),
);
router.post(
  "/sincronizar/os/:osId/nfe",
  setModelo("nfe"),
  ah(notasFiscaisController, "sincronizarPorOs"),
);
router.post(
  "/sincronizar/os/:osId",
  ah(notasFiscaisController, "sincronizarPorOs"),
);
router.get("/", paginate, ah(notasFiscaisController, "listar"));
router.get("/:id", ah(notasFiscaisController, "buscar"));
router.put("/:id/cancelar", ah(notasFiscaisController, "cancelar"));

export default router;
