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

    // Garantir colunas de recorrência em bancos existentes
    await client.query(`ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS frequencia VARCHAR(20)`);
    await client.query(`ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS intervalo INTEGER DEFAULT 1`);
    await client.query(`ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS data_termino DATE`);
    await client.query(`ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS recorrencia_origem_id INTEGER`);

    // Tabela de Clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        cpf_cnpj VARCHAR(20),
        email VARCHAR(255),
        endereco TEXT,
        cep VARCHAR(10),
        numero VARCHAR(20),
        complemento VARCHAR(100),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(2),
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
        previsao_entrega DATE,
        observacoes_veiculo TEXT,
        observacoes_gerais TEXT,
        status VARCHAR(20) DEFAULT 'Aberta',
        valor_produtos DECIMAL(10,2) DEFAULT 0,
        valor_servicos DECIMAL(10,2) DEFAULT 0,
        valor_total DECIMAL(10,2) DEFAULT 0,
        responsavel_tecnico VARCHAR(255),
        orcamento_id INTEGER,
        nf_id INTEGER,
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

    // Tabela de Agendamentos
    await client.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        veiculo_id INTEGER,
        data_agendamento DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fim TIME,
        tipo_servico VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'Agendado',
        observacoes TEXT,
        valor_estimado DECIMAL(10,2),
        mecanico_responsavel VARCHAR(255),
        lembrete_enviado BOOLEAN DEFAULT FALSE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
      )
    `);

    // Tabela de Contas a Pagar
    await client.query(`
      CREATE TABLE IF NOT EXISTS contas_pagar (
        id SERIAL PRIMARY KEY,
        descricao VARCHAR(255) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_vencimento DATE NOT NULL,
        data_pagamento DATE,
        status VARCHAR(20) DEFAULT 'Pendente',
        fornecedor VARCHAR(255),
        forma_pagamento VARCHAR(50),
        observacoes TEXT,
        arquivo_anexo VARCHAR(500),
        lembrete_enviado BOOLEAN DEFAULT FALSE,
        -- Campos de recorrência
        recorrente BOOLEAN DEFAULT FALSE,
        frequencia VARCHAR(20), -- ex: 'diario','semanal','mensal','anual'
        intervalo INTEGER DEFAULT 1, -- intervalo entre repetições
        data_termino DATE, -- data final da recorrência
        recorrencia_origem_id INTEGER, -- referencia para template de recorrência
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Lembretes
    await client.query(`
      CREATE TABLE IF NOT EXISTS lembretes (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        referencia_id INTEGER NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        mensagem TEXT NOT NULL,
        data_lembrete TIMESTAMP NOT NULL,
        enviado BOOLEAN DEFAULT FALSE,
        data_envio TIMESTAMP,
        prioridade VARCHAR(20) DEFAULT 'media',

        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Notas Fiscais
    await client.query(`
      CREATE TABLE IF NOT EXISTS notas_fiscais (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) NOT NULL UNIQUE,
        os_id INTEGER NOT NULL,
        cliente_id INTEGER NOT NULL,
        data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valor_produtos DECIMAL(10,2) DEFAULT 0,
        valor_servicos DECIMAL(10,2) DEFAULT 0,
        valor_total DECIMAL(10,2) NOT NULL,
        icms DECIMAL(10,2) DEFAULT 0,
        iss DECIMAL(10,2) DEFAULT 0,
        pis DECIMAL(10,2) DEFAULT 0,
        cofins DECIMAL(10,2) DEFAULT 0,
        total_impostos DECIMAL(10,2) DEFAULT 0,
        observacoes TEXT,
        xml_path VARCHAR(500),
        pdf_path VARCHAR(500),
        cancelada BOOLEAN DEFAULT FALSE,
        data_cancelamento TIMESTAMP,
        motivo_cancelamento TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
	);
    `);

    // Criar índices para melhor performance

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_fiscais_data 
      ON notas_fiscais(data_emissao DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_fiscais_cliente 
      ON notas_fiscais(cliente_id);
    `);

    // Tabela de empresas (emitentes)
    await client.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cnpj VARCHAR(20) NOT NULL UNIQUE,
        inscricao_municipal VARCHAR(50),
        endereco TEXT,
        cidade VARCHAR(100),
        estado VARCHAR(2),
        telefone VARCHAR(50),
        email VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Configurações de gateway / certificados por empresa
    await client.query(`
      CREATE TABLE IF NOT EXISTS gateway_configs (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        provider VARCHAR(100) NOT NULL,
        api_key TEXT,
        api_secret TEXT,
        certificado_a1 BYTEA,
        certificado_senha VARCHAR(255),
        ativo BOOLEAN DEFAULT TRUE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Histórico de mudanças de status das NFs
    await client.query(`
      CREATE TABLE IF NOT EXISTS notas_fiscais_historico (
        id SERIAL PRIMARY KEY,
        nota_fiscal_id INTEGER NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        mensagem TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fila de jobs para processamento de emissões de NF (DB-backed, simples)
    await client.query(`
      CREATE TABLE IF NOT EXISTS nf_jobs (
        id SERIAL PRIMARY KEY,
        nota_fiscal_id INTEGER NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
        payload JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        next_run_at TIMESTAMP,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dead-letter queue for jobs that exceeded attempts
    await client.query(`
      CREATE TABLE IF NOT EXISTS nf_jobs_dlq (
        id SERIAL PRIMARY KEY,
        original_job_id INTEGER,
        nota_fiscal_id INTEGER,
        payload JSONB,
        attempts INTEGER,
        last_error TEXT,
        moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Vincular NF a uma empresa emissora (se necessário) - feito após criar empresas
    await client.query(`
      ALTER TABLE notas_fiscais
      ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
    `);

    // Adicionar colunas de endereço na tabela clientes (se não existir)
    await client.query(`
      ALTER TABLE clientes 
      ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
      ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
      ADD COLUMN IF NOT EXISTS complemento VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
      ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
      ADD COLUMN IF NOT EXISTS estado VARCHAR(2);
    `);

    // Adicionar coluna nf_id na tabela ordens_servico (se não existir)
    await client.query(`
      ALTER TABLE ordens_servico 
      ADD COLUMN IF NOT EXISTS nf_id INTEGER REFERENCES notas_fiscais(id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agendamentos_data 
      ON agendamentos(data_agendamento DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agendamentos_status 
      ON agendamentos(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento 
      ON contas_pagar(data_vencimento DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contas_pagar_status 
      ON contas_pagar(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lembretes_data 
      ON lembretes(data_lembrete DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lembretes_enviado 
      ON lembretes(enviado);
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
