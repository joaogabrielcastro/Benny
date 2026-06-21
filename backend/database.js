import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool, types } = pkg;
const rawDatabaseUrl = process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl.trim().replace(/^['"]|['"]$/g, "");

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não definida. Configure a variável de ambiente com a connection string do PostgreSQL.",
  );
}

try {
  new URL(databaseUrl);
} catch {
  throw new Error(
    "DATABASE_URL inválida. Verifique formato da URL e codifique caracteres especiais da senha (ex.: @, #, %, /).",
  );
}

// Configurar pg para retornar valores numéricos como números (não strings)
types.setTypeParser(1700, function (val) {
  return parseFloat(val);
});

// Configurar pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("sslmode=disable")
    ? false
    : { rejectUnauthorized: false },
});

// Testar conexão
pool.on("connect", () => {
  console.log("✓ Conectado ao banco de dados");
});

// Função para inicializar o banco de dados
async function initDatabase() {
  const client = await pool.connect();

  try {
    // ── Multi-tenant: tenants e usuários ─────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) UNIQUE NOT NULL,
        nome VARCHAR(255) NOT NULL,
        cnpj VARCHAR(20) UNIQUE,
        email VARCHAR(255) NOT NULL,
        telefone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active',
        plano VARCHAR(50) DEFAULT 'basic',
        data_expiracao DATE,
        max_usuarios INTEGER DEFAULT 5,
        configuracoes JSONB DEFAULT '{}',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Garante tenant padrão para o modo single-tenant legado
    await client.query(`
      INSERT INTO tenants (id, slug, nome, email, status, plano)
      VALUES (1, 'default', 'Tenant Padrão', 'admin@local.test', 'active', 'basic')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        ativo BOOLEAN DEFAULT TRUE,
        ultimo_login TIMESTAMP,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, email)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id)
    `);

    // ── Tabela de Produtos/Estoque ────────────────────────────────────────────
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

    // Tabela de Serviços (catálogo)
    await client.query(`
      CREATE TABLE IF NOT EXISTS servicos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        valor_unitario DECIMAL(10,2) DEFAULT 0,
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
        cep VARCHAR(10),
        numero VARCHAR(20),
        complemento VARCHAR(100),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(2),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
          marca VARCHAR(100),
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
        token_publico VARCHAR(64) UNIQUE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
      )
    `);

    // Adicionar coluna token_publico em tabelas existentes
    await client.query(`
      ALTER TABLE orcamentos 
      ADD COLUMN IF NOT EXISTS token_publico VARCHAR(64) UNIQUE
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
      ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
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

    // Garantir colunas de recorrência em bancos existentes (após CREATE TABLE)
    await client.query(
      `ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT FALSE`,
    );
    await client.query(
      `ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS frequencia VARCHAR(20)`,
    );
    await client.query(
      `ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS intervalo INTEGER DEFAULT 1`,
    );
    await client.query(
      `ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS data_termino DATE`,
    );
    await client.query(
      `ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS recorrencia_origem_id INTEGER`,
    );

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

    await client.query(`
      ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    await client.query(`
      ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS codigo_ibge VARCHAR(7)
    `);

    await client.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS ncm VARCHAR(8)
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orcamento_produtos_orcamento_id
      ON orcamento_produtos(orcamento_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orcamento_servicos_orcamento_id
      ON orcamento_servicos(orcamento_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_os_produtos_os_id ON os_produtos(os_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_os_servicos_os_id ON os_servicos(os_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_veiculos_cliente_id ON veiculos(cliente_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_movimentacoes_os_id ON movimentacoes_estoque(os_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_movimentacoes_orcamento_id
      ON movimentacoes_estoque(orcamento_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ordens_servico_criado_em
      ON ordens_servico(criado_em DESC)
    `);

    // ── Notas fiscais (integração Nuvem Fiscal / NFS-e) ───────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS notas_fiscais (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
        ordem_servico_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
        modelo_documento VARCHAR(20) NOT NULL DEFAULT 'NFSE',
        provedor VARCHAR(40) NOT NULL DEFAULT 'nuvem_fiscal',
        status VARCHAR(40) NOT NULL DEFAULT 'configuracao_pendente',
        id_provedor VARCHAR(120),
        chave_acesso VARCHAR(60),
        numero VARCHAR(50),
        serie VARCHAR(20),
        protocolo VARCHAR(120),
        valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
        tributos JSONB NOT NULL DEFAULT '{}'::jsonb,
        dados_envio JSONB NOT NULL DEFAULT '{}'::jsonb,
        dados_resposta JSONB NOT NULL DEFAULT '{}'::jsonb,
        link_pdf TEXT,
        link_xml TEXT,
        mensagem_status TEXT,
        data_emissao TIMESTAMPTZ,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_notas_fiscais_tenant_os UNIQUE (tenant_id, ordem_servico_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_fiscais_tenant ON notas_fiscais(tenant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON notas_fiscais(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_fiscais_provedor_id ON notas_fiscais(id_provedor)
    `);

    await client.query(`
      ALTER TABLE notas_fiscais
      DROP CONSTRAINT IF EXISTS uq_notas_fiscais_tenant_os
    `);
    await client.query(`
      ALTER TABLE notas_fiscais
      DROP CONSTRAINT IF EXISTS uq_notas_fiscais_tenant_os_modelo
    `);
    await client.query(`
      ALTER TABLE notas_fiscais
      ADD CONSTRAINT uq_notas_fiscais_tenant_os_modelo
      UNIQUE (tenant_id, ordem_servico_id, modelo_documento)
    `);

    await client.query(`
      ALTER TABLE ordens_servico
      ADD COLUMN IF NOT EXISTS nf_id INTEGER REFERENCES notas_fiscais(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE ordens_servico
      ADD COLUMN IF NOT EXISTS nf_nfe_id INTEGER REFERENCES notas_fiscais(id) ON DELETE SET NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ordens_servico_nf_id ON ordens_servico(nf_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ordens_servico_nf_nfe_id ON ordens_servico(nf_nfe_id)
    `);

    // ── Adicionar tenant_id em todas as tabelas principais ───────────────────
    const tabelasComTenant = [
      "clientes",
      "veiculos",
      "produtos",
      "servicos",
      "orcamentos",
      "ordens_servico",
      "agendamentos",
      "contas_pagar",
      "lembretes",
    ];
    for (const tabela of tabelasComTenant) {
      await client.query(
        `ALTER TABLE ${tabela} ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE`,
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_${tabela}_tenant ON ${tabela}(tenant_id)`,
      );
    }

    // Recriar unique indexes como compostos com tenant_id
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_codigo_tenant ON produtos(codigo, tenant_id)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_servicos_codigo_tenant ON servicos(codigo, tenant_id)
    `);

    // Sequences de numeração ORC/OS (idempotente; ver também migrations/007)
    await client.query(`CREATE SEQUENCE IF NOT EXISTS seq_orcamento_numero`);
    await client.query(`
      SELECT setval(
        'seq_orcamento_numero',
        GREATEST(
          1,
          COALESCE(
            (SELECT MAX(SUBSTRING(numero FROM 5)::integer)
             FROM orcamentos WHERE numero ~ '^ORC-[0-9]+$'),
            0
          ) + 1
        ),
        false
      )
    `);
    await client.query(`CREATE SEQUENCE IF NOT EXISTS seq_os_numero`);
    await client.query(`
      SELECT setval(
        'seq_os_numero',
        GREATEST(
          1,
          COALESCE(
            (SELECT MAX(SUBSTRING(numero FROM 4)::integer)
             FROM ordens_servico WHERE numero ~ '^OS-[0-9]+$'),
            0
          ) + 1
        ),
        false
      )
    `);

    console.log("✓ Tabelas do banco de dados criadas/verificadas com sucesso!");
  } catch (error) {
    console.error("Erro ao inicializar banco de dados:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Inicializar banco de dados (desligar em produção com SKIP_DB_INIT_DDL=true + npm run migrate)
if (process.env.SKIP_DB_INIT_DDL !== "true") {
  initDatabase().catch(console.error);
} else {
  console.log("[INFO] SKIP_DB_INIT_DDL=true — DDL de boot ignorado; use npm run migrate");
}

export { initDatabase };
export default pool;
