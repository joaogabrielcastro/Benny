import { resolveTenantId } from "../config/singleTenant.js";
import ordensServicoService from "../services/ordensServicoService.js";
import { notFound } from "../lib/AppError.js";
import { sendPaginated } from "../lib/paginationResponse.js";
import pagamentosOsService from "../services/pagamentosOsService.js";

class OrdensServicoController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await ordensServicoService.listar(tenantId, {
      status: req.query.status,
      busca: req.query.busca,
      cliente_id: req.query.cliente_id
        ? parseInt(req.query.cliente_id, 10)
        : undefined,
      veiculo_id: req.query.veiculo_id
        ? parseInt(req.query.veiculo_id, 10)
        : undefined,
      data_inicio: req.query.data_inicio,
      data_fim: req.query.data_fim,
      ordenar: req.query.ordenar,
      direcao: req.query.direcao,
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
    const body = req.validated?.body ?? req.body;
    const result = await ordensServicoService.criar(
      resolveTenantId(req),
      body,
    );
    res.status(201).json({ ...result, message: "OS criada com sucesso" });
  }

  async atualizar(req, res) {
    const body = req.validated?.body ?? req.body;
    const result = await ordensServicoService.atualizar(
      resolveTenantId(req),
      req.params.id,
      body,
    );
    if (!result) throw notFound("OS não encontrada");
    res.json({ message: "OS atualizada com sucesso" });
  }

  async listarPagamentos(req, res) {
    res.json(
      await pagamentosOsService.listarPorOs(resolveTenantId(req), Number(req.params.id)),
    );
  }

  async registrarPagamento(req, res) {
    const body = req.validated?.body ?? req.body;
    const row = await pagamentosOsService.registrar(
      resolveTenantId(req),
      Number(req.params.id),
      body,
      req.user?.id ?? null,
    );
    res.status(201).json(row);
  }

  async atualizarPagamento(req, res) {
    const body = req.validated?.body ?? req.body;
    const row = await pagamentosOsService.atualizar(
      resolveTenantId(req),
      Number(req.params.id),
      Number(req.params.pagamentoId),
      body,
    );
    res.json(row);
  }

  async removerPagamento(req, res) {
    await pagamentosOsService.remover(
      resolveTenantId(req),
      Number(req.params.id),
      Number(req.params.pagamentoId),
    );
    res.json({ message: "Pagamento removido" });
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
