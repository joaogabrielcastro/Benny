import authService from "../services/authService.js";
import logger from "../config/logger.js";

class AuthController {
  async registrar(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({
          error: "Dados incompletos",
          message: "Email e senha são obrigatórios",
        });
      }

      const { token, user } = await authService.login(email, senha);

      res.json({
        message: "Login realizado com sucesso",
        token,
        user,
      });
    } catch (error) {
      console.error("Erro no login:", error);

      // Não expor detalhes do erro (segurança)
      res.status(401).json({
        error: "Falha no login",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/auth/me
   * Retorna dados do usuário autenticado
   */
  async me(req, res) {
    try {
      res.json({
        user: {
          id: req.user.id,
          nome: req.user.nome,
          email: req.user.email,
          role: req.user.role,
        },
        tenant: {
          id: req.tenant.id,
          nome: req.tenant.nome,
          slug: req.tenant.slug,
          plano: req.tenant.plano,
          status: req.tenant.status,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Erro ao buscar dados",
        message: error.message,
      });
    }
  }

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
        req.tenantId,
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
      const usuarios = await authService.listarUsuarios(req.tenantId);

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
