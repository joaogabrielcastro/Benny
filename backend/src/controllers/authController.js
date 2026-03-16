import { SINGLE_TENANT_ID } from "../config/singleTenant.js";
import authService from "../services/authService.js";
import logger from "../config/logger.js";

class AuthController {
  /**
   * POST /api/auth/usuarios
   * Criar novo usuário (apenas admin)
   */
  async criarUsuario(req, res) {
    try {
      const dados = req.body;

      if (!dados.nome || !dados.email || !dados.senha) {
        return res.status(400).json({
          error: "Dados incompletos",
          message: "Nome, email e senha são obrigatórios",
        });
      }

      const usuario = await authService.criarUsuario(
        SINGLE_TENANT_ID,
        dados,
        req.userId,
      );

      res.status(201).json({
        message: "Usuário criado com sucesso",
        usuario,
      });
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({
        error: "Erro ao criar usuário",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/auth/usuarios
   * Listar usuários do tenant (apenas admin)
   */
  async listarUsuarios(req, res) {
    try {
      const usuarios = await authService.listarUsuarios(SINGLE_TENANT_ID);

      res.json({
        total: usuarios.length,
        usuarios,
      });
    } catch (error) {
      logger.error("Erro ao registrar:", error);
      if (error.code === "SLUG_TAKEN")
        return res.status(409).json({ error: error.message });
      if (error.code === "EMAIL_TAKEN")
        return res.status(409).json({ error: error.message });
      if (error.code === "23505")
        return res
          .status(409)
          .json({ error: "Identificador ou e-mail já em uso" });
      res.status(500).json({ error: "Erro ao criar conta" });
    }
  }

  async login(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res
          .status(400)
          .json({ error: "E-mail e senha são obrigatórios" });
      }

      const result = await authService.login({ email, senha });
      res.json(result);
    } catch (error) {
      logger.error("Erro ao fazer login:", error);

      const infraErrorCodes = new Set([
        "28P01", // invalid_password
        "3D000", // invalid_catalog_name
        "53300", // too_many_connections
        "57P03", // cannot_connect_now
        "ECONNREFUSED",
        "ENOTFOUND",
        "ETIMEDOUT",
      ]);

      const isInfraError =
        infraErrorCodes.has(error.code) ||
        /password authentication failed|database|db|connect/i.test(
          error.message || "",
        );

      if (isInfraError) {
        return res.status(503).json({
          error: "Serviço de autenticação indisponível no momento",
        });
      }

      // 401 para credenciais inválidas
      res.status(401).json({ error: error.message || "Credenciais inválidas" });
    }
  }

  // Retorna dados do usuário logado (modo single-tenant)
  me(req, res) {
    res.json({ user: req.user });
  }
}

export default new AuthController();
