import authService from "../services/authService.js";
import logger from "../config/logger.js";

class AuthController {
  async registrar(req, res) {
    try {
      const { tenantNome, tenantSlug, tenantEmail, nome, email, senha } =
        req.body;

      if (!tenantNome || !tenantSlug || !nome || !email || !senha) {
        return res
          .status(400)
          .json({ error: "Todos os campos são obrigatórios" });
      }

      if (senha.length < 6) {
        return res
          .status(400)
          .json({ error: "Senha deve ter no mínimo 6 caracteres" });
      }

      // Slug: apenas letras minúsculas, números e hífens
      const slugLimpo = tenantSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

      const result = await authService.registrar({
        tenantNome,
        tenantSlug: slugLimpo,
        tenantEmail: tenantEmail || email,
        nome,
        email,
        senha,
      });

      res.status(201).json(result);
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
      // Sempre 401 para não revelar se conta existe
      res.status(401).json({ error: error.message || "Credenciais inválidas" });
    }
  }

  // Retorna dados do usuário logado (o token já foi validado pelo middleware)
  me(req, res) {
    res.json({ user: req.user, tenantId: req.tenantId });
  }
}

export default new AuthController();
