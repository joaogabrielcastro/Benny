import { resolveTenantId } from "../config/singleTenant.js";
import orcamentosService from "../services/orcamentosService.js";
import { AppError, notFound } from "../lib/AppError.js";
import { assertFound } from "../lib/controllerHelpers.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class OrcamentosController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { rows, total } = await orcamentosService.listar(tenantId, {
      status: req.query.status,
      busca: req.query.busca,
      limit,
      offset,
    });
    sendPaginated(res, { rows, total, page, limit });
  }

  async buscar(req, res) {
    const orc = await orcamentosService.buscarPorId(
      resolveTenantId(req),
      req.params.id,
    );
    assertFound(orc, "Orçamento não encontrado");
    res.json(orc);
  }

  async buscarPublico(req, res) {
    const orc = await orcamentosService.buscarPorToken(req.params.token);
    assertFound(orc, "Orçamento não encontrado");
    res.json(orc);
  }

  async criar(req, res) {
    const body = req.validated?.body ?? req.body;
    const result = await orcamentosService.criar(
      resolveTenantId(req),
      body,
    );
    res.status(201).json({ ...result, message: "Orçamento criado com sucesso" });
  }

  async atualizar(req, res) {
    try {
      const body = req.validated?.body ?? req.body;
      const result = await orcamentosService.atualizar(
        resolveTenantId(req),
        req.params.id,
        body,
      );
      assertFound(result, "Orçamento não encontrado");
      const message = result.os
        ? `Orçamento aprovado. OS ${result.os.numero} criada.`
        : "Orçamento atualizado com sucesso";
      res.json({ message, os: result.os || undefined });
    } catch (error) {
      if (error.code === "EDICAO_NAO_PERMITIDA") {
        throw new AppError(400, error.message);
      }
      throw error;
    }
  }

  async aprovarPublico(req, res) {
    const result = await orcamentosService.aprovarPorToken(req.params.token);
    assertFound(result, "Orçamento não encontrado");
    const os = result.os;
    res.json({
      message: os
        ? `Orçamento aprovado. OS ${os.numero} criada.`
        : "Orçamento aprovado com sucesso",
      orcamento: result.orcamento,
      os: os || undefined,
    });
  }

  async reprovarPublico(req, res) {
    const orc = await orcamentosService.reprovarPorToken(req.params.token);
    assertFound(orc, "Orçamento não encontrado");
    res.json({ message: "Orçamento reprovado", orcamento: orc });
  }

  async converterEmOS(req, res) {
    try {
      const result = await orcamentosService.converterEmOS(
        resolveTenantId(req),
        req.params.id,
      );
      assertFound(result, "Orçamento não encontrado");
      res
        .status(201)
        .json({ ...result, message: "Orçamento convertido em OS com sucesso" });
    } catch (error) {
      if (error.code === "STATUS_INVALIDO") {
        throw new AppError(400, error.message);
      }
      throw error;
    }
  }

  async deletar(req, res) {
    try {
      const ok = await orcamentosService.deletar(
        resolveTenantId(req),
        req.params.id,
      );
      if (!ok) throw notFound("Orçamento não encontrado");
      res.json({ message: "Orçamento excluído com sucesso" });
    } catch (error) {
      if (error.code === "OS_VINCULADA") {
        throw new AppError(409, error.message);
      }
      throw error;
    }
  }
}

export default new OrcamentosController();
