import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool, types } = pkg;

// Configurar pg para retornar valores numéricos como números (não strings)
types.setTypeParser(1700, function (val) {
  return parseFloat(val);
});

// Configurar pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Testar conexão
pool.on("connect", () => {
  console.log("✓ Conectado ao banco de dados PostgreSQL (Neon)");
});

// Função para inicializar o banco de dados
async function initDatabase() {
  const client = await pool.connect();

  try {
    // Tabela de Produtos/Estoque
    await client.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        quantidade INTEGER DEFAULT 0,
        valor_custo DECIMAL(10,2) DEFAULT 0,
        valor_venda DECIMAL(10,2) DEFAULT 0,
        estoque_minimo INTEGER DEFAULT 5,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        cpf_cnpj VARCHAR(20),
        email VARCHAR(255),
        endereco TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Veículos
    await client.query(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        modelo VARCHAR(255) NOT NULL,
        cor VARCHAR(50),
        placa VARCHAR(20) NOT NULL,
        ano VARCHAR(10),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);

    // Tabela de Orçamentos
    await client.query(`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) NOT NULL UNIQUE,
        cliente_id INTEGER NOT NULL,
        veiculo_id INTEGER NOT NULL,
        km INTEGER,
        observacoes_veiculo TEXT,
        observacoes_gerais TEXT,
        status VARCHAR(20) DEFAULT 'Pendente',
        valor_produtos DECIMAL(10,2) DEFAULT 0,
        valor_servicos DECIMAL(10,2) DEFAULT 0,
        valor_total DECIMAL(10,2) DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
      )
    `);

    // Tabela de Ordens de Serviço
    await client.query(`
      CREATE TABLE IF NOT EXISTS ordens_servico (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) NOT NULL UNIQUE,
        cliente_id INTEGER NOT NULL,
        veiculo_id INTEGER NOT NULL,
        km INTEGER,
        observacoes_veiculo TEXT,
        observacoes_gerais TEXT,
        status VARCHAR(20) DEFAULT 'Aberta',
        valor_produtos DECIMAL(10,2) DEFAULT 0,
        valor_servicos DECIMAL(10,2) DEFAULT 0,
        valor_total DECIMAL(10,2) DEFAULT 0,
        responsavel_tecnico VARCHAR(255),
        orcamento_id INTEGER,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finalizado_em TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
        FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id)
      )
    `);

    // Tabela de Itens de Orçamento (Produtos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS orcamento_produtos (
        id SERIAL PRIMARY KEY,
        orcamento_id INTEGER NOT NULL,
        produto_id INTEGER,
        codigo VARCHAR(50) NOT NULL,
        descricao TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        valor_unitario DECIMAL(10,2) NOT NULL,
        valor_total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
      )
    `);

    // Tabela de Itens de Orçamento (Serviços)
    await client.query(`
      CREATE TABLE IF NOT EXISTS orcamento_servicos (
        id SERIAL PRIMARY KEY,
        orcamento_id INTEGER NOT NULL,
        codigo VARCHAR(50) NOT NULL,
        descricao TEXT NOT NULL,
        quantidade DECIMAL(10,2) NOT NULL,
        valor_unitario DECIMAL(10,2) NOT NULL,
        valor_total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE
      )
    `);

    // Tabela de Itens de OS (Produtos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS os_produtos (
        id SERIAL PRIMARY KEY,
        os_id INTEGER NOT NULL,
        produto_id INTEGER,
        codigo VARCHAR(50) NOT NULL,
        descricao TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        valor_unitario DECIMAL(10,2) NOT NULL,
        valor_total DECIMAL(10,2) NOT NULL,
        baixa_estoque BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE,
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
      )
    `);

    // Tabela de Itens de OS (Serviços)
    await client.query(`
      CREATE TABLE IF NOT EXISTS os_servicos (
        id SERIAL PRIMARY KEY,
        os_id INTEGER NOT NULL,
        codigo VARCHAR(50) NOT NULL,
        descricao TEXT NOT NULL,
        quantidade DECIMAL(10,2) NOT NULL,
        valor_unitario DECIMAL(10,2) NOT NULL,
        valor_total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE
      )
    `);

    // Tabela de Movimentações de Estoque
    await client.query(`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        quantidade INTEGER NOT NULL,
        motivo TEXT,
        os_id INTEGER,
        orcamento_id INTEGER,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (produto_id) REFERENCES produtos(id),
        FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
        FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id)
      )
    `);

    // Tabela de Auditoria para rastreamento de alterações
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id SERIAL PRIMARY KEY,
        tabela VARCHAR(100) NOT NULL,
        registro_id INTEGER NOT NULL,
        acao VARCHAR(20) NOT NULL,
        dados_anteriores JSONB,
        dados_novos JSONB,
        usuario VARCHAR(100),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices para melhor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auditoria_tabela_registro 
      ON auditoria(tabela, registro_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em 
      ON auditoria(criado_em DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ordens_servico_status 
      ON ordens_servico(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orcamentos_status 
      ON orcamentos(status);
    `);

    // Remover colunas chassi das tabelas (não mais necessário)
    await client.query(`
      ALTER TABLE veiculos DROP COLUMN IF EXISTS chassi;
    `);

    await client.query(`
      ALTER TABLE ordens_servico 
      DROP COLUMN IF EXISTS chassi,
      ADD COLUMN IF NOT EXISTS previsao_entrega DATE;
    `);

    await client.query(`
      ALTER TABLE orcamentos 
      DROP COLUMN IF EXISTS chassi,
      ADD COLUMN IF NOT EXISTS previsao_entrega DATE,
      ADD COLUMN IF NOT EXISTS responsavel_tecnico VARCHAR(255);
    `);

    // Adicionar coluna orcamento_id na tabela movimentacoes_estoque se não existir
    await client.query(`
      ALTER TABLE movimentacoes_estoque 
      ADD COLUMN IF NOT EXISTS orcamento_id INTEGER REFERENCES orcamentos(id);
    `);

    // Adicionar coluna marca na tabela veiculos se não existir
    await client.query(`
      ALTER TABLE veiculos 
      ADD COLUMN IF NOT EXISTS marca VARCHAR(255);
    `);

    console.log("✓ Tabelas do banco de dados criadas/verificadas com sucesso!");
  } catch (error) {
    console.error("Erro ao inicializar banco de dados:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Inicializar banco de dados
initDatabase().catch(console.error);

export default pool;
