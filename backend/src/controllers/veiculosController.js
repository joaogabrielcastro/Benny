import { resolveTenantId } from "../config/singleTenant.js";
import veiculosService from "../services/veiculosService.js";
import { consultarVeiculoPorPlaca } from "../services/placaLookupService.js";
import { AppError, badRequest } from "../lib/AppError.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class VeiculosController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await veiculosService.listar(tenantId, {
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }

  async listarPorCliente(req, res) {
    const rows = await veiculosService.listarPorCliente(
      resolveTenantId(req),
      req.params.clienteId,
    );
    res.json(rows);
  }

  async criar(req, res) {
    const body = req.validated?.body ?? req.body;
    const veiculo = await veiculosService.criar(resolveTenantId(req), body);
    res
      .status(201)
      .json({ id: veiculo.id, message: "Veículo criado com sucesso" });
  }

  async consultarPlaca(req, res) {
    const resultado = await consultarVeiculoPorPlaca(req.params.placa);
    if (!resultado.ok) {
      throw badRequest(resultado.erro);
    }
    const { ok: _ok, ...dados } = resultado;
    res.json(dados);
  }
}

export default new VeiculosController();
