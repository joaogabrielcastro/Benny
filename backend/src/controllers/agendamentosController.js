import { resolveTenantId } from "../config/singleTenant.js";
import agendamentosService from "../services/agendamentosService.js";
import lembretesService from "../services/lembretesService.js";
import logger from "../config/logger.js";
import { assertFound } from "../lib/controllerHelpers.js";
import { AppError } from "../lib/AppError.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class AgendamentosController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await agendamentosService.listar(tenantId, {
      ...req.query,
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }

  async buscar(req, res) {
    const ag = await agendamentosService.buscarPorId(
      resolveTenantId(req),
      req.params.id,
    );
    assertFound(ag, "Agendamento não encontrado");
    res.json(ag);
  }

  async criar(req, res) {
    try {
      const novo = await agendamentosService.criar(
        resolveTenantId(req),
        req.body,
      );

      const dataLembrete = new Date(novo.data_agendamento);
      dataLembrete.setDate(dataLembrete.getDate() - 1);
      dataLembrete.setHours(9, 0, 0, 0);

      try {
        await lembretesService.criar(resolveTenantId(req), {
          tipo: "agendamento",
          referencia_id: novo.id,
          titulo: "Lembrete de Agendamento",
          mensagem: `Agendamento amanhã às ${novo.hora_inicio} - ${novo.tipo_servico}`,
          data_lembrete: dataLembrete,
          prioridade: "alta",
        });
      } catch (err) {
        logger.error("Falha ao criar lembrete automático:", err);
      }

      res
        .status(201)
        .json({ message: "Agendamento criado com sucesso", agendamento: novo });
    } catch (error) {
      if (error?.code === "CONFLITO_AGENDAMENTO") {
        throw new AppError(400, error.message);
      }
      throw error;
    }
  }

  async atualizar(req, res) {
    const atualizado = await agendamentosService.atualizar(
      resolveTenantId(req),
      req.params.id,
      req.body,
    );
    assertFound(atualizado, "Agendamento não encontrado");
    res.json({
      message: "Agendamento atualizado com sucesso",
      agendamento: atualizado,
    });
  }

  async deletar(req, res) {
    await agendamentosService.deletar(resolveTenantId(req), req.params.id);
    res.json({ message: "Agendamento deletado com sucesso" });
  }

  async hojeLista(req, res) {
    const lista = await agendamentosService.hojeLista(resolveTenantId(req));
    res.json(lista);
  }
}

export default new AgendamentosController();
