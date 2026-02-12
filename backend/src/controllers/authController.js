/**
 * Controller de Autenticação
 */

import authService from "../services/authService.js";

class AuthController {
  /**
   * POST /api/auth/login
   * Login de usuário (única rota pública de auth)
   */
  async login(req, res) {
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
      res.status(500).json({
        error: "Erro ao listar usuários",
        message: error.message,
      });
    }
  }

  /**
   * PATCH /api/auth/usuarios/:id/desativar
   * Desativar usuário
   */
  async desativarUsuario(req, res) {
    try {
      const { id } = req.params;

      // Não pode desativar a si mesmo
      if (parseInt(id) === req.userId) {
        return res.status(400).json({
          error: "Operação inválida",
          message: "Você não pode desativar sua própria conta",
        });
      }

      const usuario = await authService.desativarUsuario(id, req.tenantId);

      res.json({
        message: "Usuário desativado com sucesso",
        usuario,
      });
    } catch (error) {
      res.status(500).json({
        error: "Erro ao desativar usuário",
        message: error.message,
      });
    }
  }

  /**
   * PATCH /api/auth/usuarios/:id/reativar
   * Reativar usuário
   */
  async reativarUsuario(req, res) {
    try {
      const { id } = req.params;

      const usuario = await authService.reativarUsuario(id, req.tenantId);

      res.json({
        message: "Usuário reativado com sucesso",
        usuario,
      });
    } catch (error) {
      res.status(500).json({
        error: "Erro ao reativar usuário",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/auth/alterar-senha
   * Alterar senha do usuário autenticado
   */
  async alterarSenha(req, res) {
    try {
      const { senhaAtual, senhaNova } = req.body;

      if (!senhaAtual || !senhaNova) {
        return res.status(400).json({
          error: "Dados incompletos",
          message: "Senha atual e nova senha são obrigatórias",
        });
      }

      if (senhaNova.length < 6) {
        return res.status(400).json({
          error: "Senha fraca",
          message: "A nova senha deve ter no mínimo 6 caracteres",
        });
      }

      await authService.alterarSenha(req.userId, senhaAtual, senhaNova);

      res.json({
        message: "Senha alterada com sucesso",
      });
    } catch (error) {
      res.status(400).json({
        error: "Erro ao alterar senha",
        message: error.message,
      });
    }
  }
}

export default new AuthController();
