import { resolveTenantId } from "../config/singleTenant.js";
import servicosService from "../services/servicosService.js";
import { assertFound } from "../lib/controllerHelpers.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class ServicosController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await servicosService.listar(tenantId, {
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }

  async buscar(req, res) {
    const servico = await servicosService.buscarPorId(
      resolveTenantId(req),
      req.params.id,
    );
    assertFound(servico, "Serviço não encontrado");
    res.json(servico);
  }

  async criar(req, res) {
    const body = req.validated?.body ?? req.body;
    const servico = await servicosService.criar(resolveTenantId(req), body);
    res.status(201).json({ servico, message: "Serviço criado" });
  }

  async atualizar(req, res) {
    const body = req.validated?.body ?? req.body;
    const servico = await servicosService.atualizar(
      resolveTenantId(req),
      req.params.id,
      body,
    );
    assertFound(servico, "Serviço não encontrado");
    res.json({ servico, message: "Serviço atualizado" });
  }

  async deletar(req, res) {
    await servicosService.deletar(resolveTenantId(req), req.params.id);
    res.json({ message: "Serviço deletado com sucesso" });
  }
}

export default new ServicosController();
