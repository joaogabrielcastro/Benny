import { resolveTenantId } from "../config/singleTenant.js";
import ordensServicoService from "../services/ordensServicoService.js";
import { notFound } from "../lib/AppError.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class OrdensServicoController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await ordensServicoService.listar(tenantId, {
      status: req.query.status,
      busca: req.query.busca,
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }

  async buscar(req, res) {
    const os = await ordensServicoService.buscarPorId(
      resolveTenantId(req),
      req.params.id,
    );
    if (!os) throw notFound("OS não encontrada");
    res.json(os);
  }

  async criar(req, res) {
    const result = await ordensServicoService.criar(
      resolveTenantId(req),
      req.body,
    );
    res.status(201).json({ ...result, message: "OS criada com sucesso" });
  }

  async atualizar(req, res) {
    const result = await ordensServicoService.atualizar(
      resolveTenantId(req),
      req.params.id,
      req.body,
    );
    if (!result) throw notFound("OS não encontrada");
    res.json({ message: "OS atualizada com sucesso" });
  }

  async deletar(req, res) {
    const ok = await ordensServicoService.deletar(
      resolveTenantId(req),
      req.params.id,
    );
    if (!ok) throw notFound("OS não encontrada");
    res.json({ message: "Ordem de serviço excluída com sucesso" });
  }
}

export default new OrdensServicoController();
