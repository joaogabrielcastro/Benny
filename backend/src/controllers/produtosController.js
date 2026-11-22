import { resolveTenantId } from "../config/singleTenant.js";
import produtosService from "../services/produtosService.js";
import { AppError, badRequest } from "../lib/AppError.js";
import { assertFound, rethrowKnownErrors } from "../lib/controllerHelpers.js";
import { sendPaginated } from "../lib/paginationResponse.js";

class ProdutosController {
  async listar(req, res) {
    const tenantId = resolveTenantId(req);
    const { limit, offset, page } = req.pagination;
    const { busca, estoque, categoria } = req.query;
    const { rows, total } = await produtosService.listar(tenantId, {
      limit,
      offset,
      busca: busca || undefined,
      categoria: typeof categoria === "string" && categoria ? categoria : undefined,
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

  async movimentacoes(req, res) {
    const { limit, offset, page } = req.pagination;
    const produtoId = parseInt(req.query.produto_id, 10);
    const { rows, total } = await produtosService.listarMovimentacoes(
      resolveTenantId(req),
      {
        produto_id: Number.isFinite(produtoId) && produtoId > 0 ? produtoId : undefined,
        tipo: req.query.tipo,
        limit,
        offset,
      },
    );
    sendPaginated(res, { rows, total, page, limit });
  }

  async movimentar(req, res) {
    const body = req.validated?.body ?? req.body;
    try {
      const produto = await produtosService.movimentar(
        resolveTenantId(req),
        Number(req.params.id),
        body,
      );
      assertFound(produto, "Produto não encontrado");
      res.status(201).json({ message: "Movimentação registrada", produto });
    } catch (error) {
      if (error?.code === "ESTOQUE_INSUFICIENTE") {
        throw badRequest(error.message);
      }
      throw error;
    }
  }

  async categorias(req, res) {
    res.json(await produtosService.listarCategorias(resolveTenantId(req), "produtos"));
  }

  async categoriasServicos(req, res) {
    res.json(await produtosService.listarCategorias(resolveTenantId(req), "servicos"));
  }

  async deletar(req, res) {
    await produtosService.deletar(resolveTenantId(req), req.params.id);
    res.json({ message: "Produto deletado com sucesso" });
  }
}

export default new ProdutosController();
