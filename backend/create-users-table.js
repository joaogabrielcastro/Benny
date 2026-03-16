/**
 * Script para criar tabela de usuários simples (sem multi-tenant)
 */

import pool from './database.js';

async function createUsersTable() {
  try {
    console.log('🔨 Criando tabela de usuários...');

    // Criar tabela users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        ativo BOOLEAN DEFAULT true,
        ultimo_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabela users criada com sucesso!');

    // Criar índice no email
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    console.log('✅ Índice no email criado!');

    const result = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\n📊 Total de usuários: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createUsersTable();
