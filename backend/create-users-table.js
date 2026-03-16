/**
 * Script legado mantido por compatibilidade.
 * Garante a tabela usuarios usada pelo login atual.
 */

import pool from './database.js';

async function createUsersTable() {
  try {
    console.log('🔨 Garantindo tabela de usuários...');

    // Criar tabela usuarios usada pela autenticação atual
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL DEFAULT 1,
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

    console.log('✅ Tabela usuarios criada com sucesso!');

    // Criar índice no email
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)
    `);

    console.log('✅ Índice no email criado!');

    const result = await pool.query('SELECT COUNT(*) FROM usuarios');
    console.log(`\n📊 Total de usuários: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createUsersTable();
