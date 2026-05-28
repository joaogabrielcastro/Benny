import { resolveTenantId } from "../config/singleTenant.js";
import notasFiscaisService from "../services/notasFiscaisService.js";
import { AppError, notFound } from "../lib/AppError.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class NotasFiscaisController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await notasFiscaisService.listar(tenantId, {
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }

  async buscar(req, res) {
    const row = await notasFiscaisService.buscarPorId(
      resolveTenantId(req),
      req.params.id,
    );
    if (!row) throw notFound("Nota fiscal não encontrada");
    res.json(notasFiscaisService.mapNfParaRespostaApi(row));
  }

  async listarPorOs(req, res) {
    const rows = await notasFiscaisService.listarPorOs(
      resolveTenantId(req),
      req.params.osId,
    );
    res.json(rows.map(notasFiscaisService.mapNfParaRespostaApi));
  }

  async sincronizarPorOs(req, res) {
    const modelo =
      req.params.modelo?.toUpperCase() === "NFE" ? "NFE" : "NFSE";
    const result = await notasFiscaisService.sincronizarPorOs(
      resolveTenantId(req),
      req.params.osId,
      modelo,
    );
    if (result.erro) throw new AppError(400, result.erro);
    res.json({ message: result.message, nf: result.nf });
  }

  async gerar(req, res) {
    const forcarNovaEmissao =
      req.query.forcar === "1" || req.query.forcar === "true";
    const modeloParam = (
      req.params.modelo ||
      req.query.modelo ||
      "NFSE"
    ).toUpperCase();
    const modeloDocumento = modeloParam === "NFE" ? "NFE" : "NFSE";
    const result = await notasFiscaisService.gerarParaOs(
      resolveTenantId(req),
      req.params.osId,
      { forcarNovaEmissao, modeloDocumento },
    );
    if (result.erro) throw new AppError(400, result.erro);
    res.status(201).json({ message: result.message, nf: result.nf });
  }

  async cancelar(req, res) {
    const body = req.validated?.body ?? req.body ?? {};
    const result = await notasFiscaisService.cancelar(
      resolveTenantId(req),
      req.params.id,
      body,
    );
    if (result.erro) throw new AppError(400, result.erro);
    res.json({ message: result.message, nf: result.nf });
  }
}

export default new NotasFiscaisController();
