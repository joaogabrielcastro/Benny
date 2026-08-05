import authService from "../services/authService.js";
import { AppError } from "../lib/AppError.js";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  clearAuthCookieOptions,
} from "../lib/authCookie.js";

class AuthController {
  async login(req, res) {
    const { email, senha } = req.validated?.body ?? req.body;

    try {
      const result = await authService.login({ email, senha });
      res.cookie(AUTH_COOKIE_NAME, result.token, authCookieOptions());
      res.json(result);
    } catch (error) {
      const infraErrorCodes = new Set([
        "28P01",
        "3D000",
        "53300",
        "57P03",
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
        throw new AppError(
          503,
          "Serviço de autenticação indisponível no momento",
        );
      }

      throw new AppError(401, error.message || "Credenciais inválidas");
    }
  }

  me(req, res) {
    res.json({ user: req.user });
  }

  logout(_req, res) {
    res.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions());
    res.json({ message: "Logout realizado" });
  }
}

export default new AuthController();
