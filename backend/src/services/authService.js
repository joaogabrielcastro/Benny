/**
 * Service de Autenticação
 * 
 * Login simples para sistema single-tenant
 */

import bcrypt from "bcrypt";
import pool from "../../database.js";
import authMiddleware from "../middleware/authMiddleware.js";

class AuthService {
  /**
   * Login de usuário
   * Retorna token JWT
   */
  async login(email, senha) {
    // 1. Buscar usuário por email
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
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

    // 4. Gerar token JWT
    const token = authMiddleware.generateToken(
      user.id,
      user.role,
    );

    // 5. Atualizar último login
    await pool.query(
      "UPDATE users SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id],
    );

    // 6. Retornar dados
    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Criar usuário
   */
  async criarUsuario(nome, email, senha, role = 'user') {
    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      `INSERT INTO users (nome, email, senha_hash, role, ativo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, nome, email, role, created_at`,
      [nome, email.toLowerCase(), senhaHash, role],
    );

    return result.rows[0];
  }

  /**
   * Listar usuários
   */
  async listarUsuarios() {
    const result = await pool.query(
      `SELECT id, nome, email, role, ativo, ultimo_login, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return result.rows;
  }

  /**
   * Alterar senha
   */
  async alterarSenha(userId, senhaAtual, senhaNova) {
    // Buscar usuário
    const result = await pool.query(
      "SELECT senha_hash FROM users WHERE id = $1",
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

    // Atualizar senha
    // Atualizar senha
    await pool.query(
      "UPDATE users SET senha_hash = $1 WHERE id = $2",
      [novoHash, userId],
    );

    return { message: "Senha alterada com sucesso" };
  }
}

export default new AuthService();
