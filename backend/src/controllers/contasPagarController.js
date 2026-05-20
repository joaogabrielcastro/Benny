import { resolveTenantId } from "../config/singleTenant.js";
import contasPagarService from "../services/contasPagarService.js";
import lembretesService from "../services/lembretesService.js";
import logger from "../config/logger.js";
import { assertFound } from "../lib/controllerHelpers.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class ContasPagarController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await contasPagarService.listar(tenantId, {
      ...req.query,
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }

  async buscar(req, res) {
    const conta = await contasPagarService.buscarPorId(
      resolveTenantId(req),
      req.params.id,
    );
    assertFound(conta, "Conta não encontrada");
    res.json(conta);
  }

  async criar(req, res) {
    const nova = await contasPagarService.criar(resolveTenantId(req), req.body);

    try {
      const dataLembrete = new Date(nova.data_vencimento);
      dataLembrete.setDate(dataLembrete.getDate() - 3);
      dataLembrete.setHours(9, 0, 0, 0);
      await lembretesService.criar(resolveTenantId(req), {
        tipo: "conta_pagar",
        referencia_id: nova.id,
        titulo: "Lembrete de Pagamento",
        mensagem: `Conta a vencer em 3 dias: ${nova.descricao} - ${nova.valor}`,
        data_lembrete: dataLembrete,
        prioridade: "alta",
      });
    } catch (err) {
      logger.error("Falha ao criar lembrete automático para conta:", err);
    }

    res.status(201).json({ message: "Conta criada com sucesso", conta: nova });
  }

  async atualizar(req, res) {
    const updated = await contasPagarService.atualizar(
      resolveTenantId(req),
      req.params.id,
      req.body,
    );
    assertFound(updated, "Conta não encontrada");
    res.json({ message: "Conta atualizada com sucesso", conta: updated });
  }

  async deletar(req, res) {
    await contasPagarService.deletar(resolveTenantId(req), req.params.id);
    res.json({ message: "Conta deletada com sucesso" });
  }

  async alertasResumo(req, res) {
    const resumo = await contasPagarService.alertasResumo(resolveTenantId(req));
    res.json(resumo);
  }
}

export default new ContasPagarController();
