import { resolveTenantId } from "../config/singleTenant.js";
import produtosService from "../services/produtosService.js";
import { AppError } from "../lib/AppError.js";
import { assertFound, rethrowKnownErrors } from "../lib/controllerHelpers.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class ProdutosController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { busca, estoque } = req.query;
    const { rows, total } = await produtosService.listar(tenantId, {
      limit,
      offset,
      busca: busca || undefined,
      estoque:
        estoque === "baixo" || estoque === "zerado" ? estoque : undefined,
    });
    res.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
    sendPaginated(res, { rows, total, page, limit });
  }

  async estoqueBaixo(req, res) {
    const rows = await produtosService.estoqueBaixo(resolveTenantId(req));
    res.json(rows);
  }

  async diagnostico(req, res) {
    const data = await produtosService.diagnostico(resolveTenantId(req));
    res.json(data);
  }

  async buscar(req, res) {
    const produto = await produtosService.buscarPorId(
      resolveTenantId(req),
      req.params.id,
    );
    assertFound(produto, "Produto não encontrado");
    res.json(produto);
  }

  async criar(req, res) {
    try {
      const body = req.validated?.body ?? req.body;
      const produto = await produtosService.criar(resolveTenantId(req), body);
      res.status(201).json({
        id: produto.id,
        message: "Produto criado com sucesso",
        produto,
      });
    } catch (error) {
      rethrowKnownErrors(error);
    }
  }

  async atualizar(req, res) {
    try {
      const body = req.validated?.body ?? req.body;
      const produto = await produtosService.atualizar(
        resolveTenantId(req),
        req.params.id,
        body,
      );
      assertFound(produto, "Produto não encontrado");
      res.json({ message: "Produto atualizado com sucesso", produto });
    } catch (error) {
      rethrowKnownErrors(error);
    }
  }

  async deletar(req, res) {
    await produtosService.deletar(resolveTenantId(req), req.params.id);
    res.json({ message: "Produto deletado com sucesso" });
  }
}

export default new ProdutosController();
