import { resolveTenantId } from "../config/singleTenant.js";
import clientesService from "../services/clientesService.js";
import { notFound } from "../lib/AppError.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class ClientesController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const busca = req.query.busca || req.validated?.query?.busca;

    const { rows, total } = await clientesService.listar(tenantId, {
      busca,
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }

  async buscar(req, res) {
    const cliente = await clientesService.buscarPorId(
      resolveTenantId(req),
      req.params.id,
    );
    if (!cliente) throw notFound("Cliente não encontrado");
    res.json(cliente);
  }

  async criar(req, res) {
    const body = req.validated?.body ?? req.body;
    const cliente = await clientesService.criar(resolveTenantId(req), body);
    res
      .status(201)
      .json({ id: cliente.id, message: "Cliente criado com sucesso" });
  }

  async atualizar(req, res) {
    const body = req.validated?.body ?? req.body;
    await clientesService.atualizar(
      resolveTenantId(req),
      req.params.id,
      body,
    );
    res.json({ message: "Cliente atualizado com sucesso" });
  }

  async deletar(req, res) {
    const cliente = await clientesService.deletar(
      resolveTenantId(req),
      req.params.id,
    );
    if (!cliente) throw notFound("Cliente não encontrado");
    res.json({
      message: "Cliente e vínculos excluídos com sucesso",
      removidos: cliente.removidos,
    });
  }
}

export default new ClientesController();
