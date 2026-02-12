/**
 * Service de Autenticação
 * 
 * Login simples e direto para SaaS pequeno
 */

import bcrypt from "bcrypt";
import pool from "../../database.js";
import authMiddleware from "../middleware/authMiddleware.js";

class AuthService {
  /**
   * Login de usuário
   * Retorna token JWT com tenantId incluso
   */
  async login(email, senha) {
    // 1. Buscar usuário por email (sem filtrar por tenant ainda)
    const result = await pool.query(
      `SELECT u.*, t.status as tenant_status, t.data_expiracao, t.nome as tenant_nome
       FROM usuarios u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
      [email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      throw new Error("Email ou senha incorretos");
    }

    const user = result.rows[0];

    // 2. Validar senha
    const senhaValida = await bcrypt.compare(senha, user.senha_hash);

    if (!senhaValida) {
      throw new Error("Email ou senha incorretos");
    }

    // 3. Validar se usuário está ativo
    if (!user.ativo) {
      throw new Error(
        "Sua conta foi desativada. Contate o administrador.",
      );
    }

    // 4. BLOQUEIO AUTOMÁTICO: Validar tenant
    if (user.tenant_status !== "active") {
      throw new Error(`Sua organização está ${user.tenant_status}`);
    }

    // 5. BLOQUEIO AUTOMÁTICO: Validar expiração
    if (user.data_expiracao) {
      const now = new Date();
      const expiracao = new Date(user.data_expiracao);

      if (expiracao < now) {
        throw new Error("Sua assinatura expirou. Renove para continuar.");
      }
    }

    // 6. Gerar token JWT
    const token = authMiddleware.generateToken(
      user.id,
      user.tenant_id,
      user.role,
    );

    // 7. Atualizar último login
    await pool.query(
      "UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id],
    );

    // 8. Retornar dados
    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        tenantNome: user.tenant_nome,
      },
    };
  }

  /**
   * Criar primeiro usuário de um novo tenant
   * (Usado no onboarding)
   */
  async criarPrimeiroUsuario(tenantId, nome, email, senha) {
    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, role, ativo)
       VALUES ($1, $2, $3, $4, 'admin', true)
       RETURNING id, nome, email, role, tenant_id`,
      [tenantId, nome, email.toLowerCase(), senhaHash],
    );

    return result.rows[0];
  }

  /**
   * Criar usuário adicional (por admin)
   */
  async criarUsuario(tenantId, dados, criadoPor) {
    // Validar limite de usuários
    const tenant = await pool.query("SELECT * FROM tenants WHERE id = $1", [
      tenantId,
    ]);

    if (tenant.rows[0].max_usuarios) {
      const countResult = await pool.query(
        "SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = $1 AND ativo = true",
        [tenantId],
      );

      const total = parseInt(countResult.rows[0].total);

      if (total >= tenant.rows[0].max_usuarios) {
        throw new Error(
          `Limite de ${tenant.rows[0].max_usuarios} usuários atingido. Faça upgrade do plano.`,
        );
      }
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(dados.senha, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, role, ativo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, nome, email, role, tenant_id, criado_em`,
      [
        tenantId,
        dados.nome,
        dados.email.toLowerCase(),
        senhaHash,
        dados.role || "user",
      ],
    );

    return result.rows[0];
  }

  /**
   * Listar usuários do tenant
   */
  async listarUsuarios(tenantId) {
    const result = await pool.query(
      `SELECT id, nome, email, role, ativo, ultimo_login, criado_em
       FROM usuarios
       WHERE tenant_id = $1
       ORDER BY criado_em DESC`,
      [tenantId],
    );

    return result.rows;
  }

  /**
   * Desativar usuário
   */
  async desativarUsuario(userId, tenantId) {
    const result = await pool.query(
      `UPDATE usuarios 
       SET ativo = false
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, nome, email`,
      [userId, tenantId],
    );

    return result.rows[0];
  }

  /**
   * Reativar usuário
   */
  async reativarUsuario(userId, tenantId) {
    const result = await pool.query(
      `UPDATE usuarios 
       SET ativo = true
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, nome, email`,
      [userId, tenantId],
    );

    return result.rows[0];
  }

  /**
   * Alterar senha
   */
  async alterarSenha(userId, senhaAtual, senhaNova) {
    // Buscar usuário
    const result = await pool.query(
      "SELECT senha_hash FROM usuarios WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      throw new Error("Usuário não encontrado");
    }

    // Validar senha atual
    const senhaValida = await bcrypt.compare(
      senhaAtual,
      result.rows[0].senha_hash,
    );

    if (!senhaValida) {
      throw new Error("Senha atual incorreta");
    }

    // Hash da nova senha
    const novoHash = await bcrypt.hash(senhaNova, 10);

    // Atualizar
    await pool.query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [
      novoHash,
      userId,
    ]);

    return { message: "Senha alterada com sucesso" };
  }
}

export default new AuthService();
