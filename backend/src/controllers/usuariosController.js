import { resolveTenantId } from "../config/singleTenant.js";
import usuariosService from "../services/usuariosService.js";
import { AppError, notFound } from "../lib/AppError.js";
import { rethrowKnownErrors } from "../lib/controllerHelpers.js";

class UsuariosController {
  async listar(req, res) {
    const rows = await usuariosService.listar(resolveTenantId(req));
    res.json(rows);
  }

  async buscar(req, res) {
    const row = await usuariosService.buscarPorId(
      resolveTenantId(req),
      req.params.id,
    );
    if (!row) throw notFound("Usuário não encontrado");
    res.json(row);
  }

  async criar(req, res) {
    try {
      const body = req.validated?.body ?? req.body;
      const user = await usuariosService.criar(resolveTenantId(req), body);
      res.status(201).json({ message: "Usuário criado", user });
    } catch (error) {
      if (error.code === "23505") {
        throw new AppError(409, "E-mail já cadastrado");
      }
      rethrowKnownErrors(error);
    }
  }

  async atualizar(req, res) {
    try {
      const body = req.validated?.body ?? req.body;
      const user = await usuariosService.atualizar(
        resolveTenantId(req),
        req.params.id,
        body,
        { actorUserId: req.user?.id },
      );
      if (!user) throw notFound("Usuário não encontrado");
      res.json({ message: "Usuário atualizado", user });
    } catch (error) {
      if (error.code === "23505") {
        throw new AppError(409, "E-mail já cadastrado");
      }
      if (error.code === "SELF_DEACTIVATE" || error.code === "SELF_DEMOTE") {
        throw new AppError(400, error.message);
      }
      rethrowKnownErrors(error);
    }
  }
}

export default new UsuariosController();
