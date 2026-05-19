import express from "express";
import notasFiscaisController from "../controllers/notasFiscaisController.js";

const router = express.Router();

router.get(
  "/os/:osId",
  notasFiscaisController.listarPorOs.bind(notasFiscaisController),
);
router.post(
  "/gerar/:osId/nfse",
  notasFiscaisController.gerar.bind(notasFiscaisController),
);
router.post(
  "/gerar/:osId/nfe",
  (req, res, next) => {
    req.params.modelo = "nfe";
    next();
  },
  notasFiscaisController.gerar.bind(notasFiscaisController),
);
router.post(
  "/gerar/:osId",
  notasFiscaisController.gerar.bind(notasFiscaisController),
);
router.post(
  "/sincronizar/os/:osId/nfse",
  (req, res, next) => {
    req.params.modelo = "nfse";
    next();
  },
  notasFiscaisController.sincronizarPorOs.bind(notasFiscaisController),
);
router.post(
  "/sincronizar/os/:osId/nfe",
  (req, res, next) => {
    req.params.modelo = "nfe";
    next();
  },
  notasFiscaisController.sincronizarPorOs.bind(notasFiscaisController),
);
router.post(
  "/sincronizar/os/:osId",
  notasFiscaisController.sincronizarPorOs.bind(notasFiscaisController),
);
router.get("/", notasFiscaisController.listar.bind(notasFiscaisController));
router.get("/:id", notasFiscaisController.buscar.bind(notasFiscaisController));
router.put(
  "/:id/cancelar",
  notasFiscaisController.cancelar.bind(notasFiscaisController),
);

export default router;
