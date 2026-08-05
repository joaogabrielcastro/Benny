import express from "express";
import notasFiscaisController from "../controllers/notasFiscaisController.js";
import { paginate } from "../middleware/paginate.js";
import { validate } from "../lib/validate.js";
import { ah } from "../lib/routeUtils.js";
import { cancelarNotaFiscalSchema } from "../schemas/notaFiscalSchemas.js";
import { idParamSchema, osIdParamSchema } from "../schemas/commonSchemas.js";

const router = express.Router();

const setModelo = (modelo) => (req, _res, next) => {
  req.params.modelo = modelo;
  next();
};

router.get("/features", ah(notasFiscaisController, "features"));
router.get(
  "/os/:osId",
  validate(osIdParamSchema, "params"),
  ah(notasFiscaisController, "listarPorOs"),
);
router.post(
  "/gerar/:osId/nfse",
  validate(osIdParamSchema, "params"),
  ah(notasFiscaisController, "gerar"),
);
router.post(
  "/gerar/:osId/nfe",
  validate(osIdParamSchema, "params"),
  setModelo("nfe"),
  ah(notasFiscaisController, "gerar"),
);
router.post(
  "/gerar/:osId",
  validate(osIdParamSchema, "params"),
  ah(notasFiscaisController, "gerar"),
);
router.post(
  "/sincronizar/os/:osId/nfse",
  validate(osIdParamSchema, "params"),
  setModelo("nfse"),
  ah(notasFiscaisController, "sincronizarPorOs"),
);
router.post(
  "/sincronizar/os/:osId/nfe",
  validate(osIdParamSchema, "params"),
  setModelo("nfe"),
  ah(notasFiscaisController, "sincronizarPorOs"),
);
router.post(
  "/sincronizar/os/:osId",
  validate(osIdParamSchema, "params"),
  ah(notasFiscaisController, "sincronizarPorOs"),
);
router.get("/", paginate, ah(notasFiscaisController, "listar"));
router.get(
  "/:id/pdf",
  validate(idParamSchema, "params"),
  ah(notasFiscaisController, "baixarPdf"),
);
router.get(
  "/:id",
  validate(idParamSchema, "params"),
  ah(notasFiscaisController, "buscar"),
);
router.put(
  "/:id/cancelar",
  validate(idParamSchema, "params"),
  validate(cancelarNotaFiscalSchema),
  ah(notasFiscaisController, "cancelar"),
);

export default router;
