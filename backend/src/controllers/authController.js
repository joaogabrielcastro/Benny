import authService from "../services/authService.js";
import logger from "../config/logger.js";

class AuthController {
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
