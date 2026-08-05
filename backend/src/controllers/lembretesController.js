import { resolveTenantId } from "../config/singleTenant.js";
import lembretesService from "../services/lembretesService.js";
import { assertFound } from "../lib/controllerHelpers.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class LembretesController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await lembretesService.listar(tenantId, {
      ...req.query,
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }

  async hoje(req, res) {
    const rows = await lembretesService.hoje(resolveTenantId(req));
    res.json(rows);
  }

  async marcarEnviado(req, res) {
    const lembrete = await lembretesService.marcarEnviado(
      resolveTenantId(req),
      req.params.id,
    );
    assertFound(lembrete, "Lembrete não encontrado");
    res.json({ message: "Lembrete marcado como enviado", lembrete });
  }
}

export default new LembretesController();
