/**
 * Script para criar usuário de teste
 */

import bcrypt from 'bcrypt';
import pool from './database.js';

async function createTestUser() {
  try {
    console.log('🔨 Criando usuário de teste...');

    // Garante tenant padrão para satisfazer FK de usuarios.tenant_id
    await pool.query(`
      INSERT INTO tenants (id, slug, nome, email, status, plano)
      VALUES (1, 'default', 'Tenant Padrão', 'admin@local.test', 'active', 'basic')
      ON CONFLICT (id) DO NOTHING
    `);

    // Dados do usuário
    const nome = 'Admin Sistema';
    const email = 'admin@oficina.com';
    const senha = '123456'; // Senha simples para teste
    const role = 'admin';

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Verificar se usuário já existe
    const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);

    if (exists.rows.length > 0) {
      console.log('⚠️  Usuário já existe!');
      console.log(`\n📧 Email: ${email}`);
      console.log(`🔑 Senha: ${senha}`);
      return;
    }

    // Criar usuário
    const result = await pool.query(
      `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, role, ativo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, nome, email, role`,
      [1, nome, email, senhaHash, role]
    );

    const user = result.rows[0];

    console.log('✅ Usuário criado com sucesso!');
    console.log(`\n📊 Dados do usuário:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.nome}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`\n🔐 Credenciais de login:`);
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${senha}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createTestUser();
