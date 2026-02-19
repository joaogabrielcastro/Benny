-- Migration: Add Multi-Tenant Support
-- Executar este arquivo para adicionar suporte multi-tenant ao banco existente

-- 1. Criar tabela de tenants (organizações/oficinas)
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, canceled
  plano VARCHAR(50) DEFAULT 'basic',   -- basic, premium, enterprise
  data_expiracao DATE,
  max_usuarios INTEGER DEFAULT 5,
  max_orcamentos_mes INTEGER DEFAULT 100,
  configuracoes JSONB DEFAULT '{}',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar tabela de usuários (para autenticação por tenant)
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user', -- admin, user, viewer
  ativo BOOLEAN DEFAULT TRUE,
  ultimo_login TIMESTAMP,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
);

-- 3. Adicionar tenant_id em todas as tabelas principais
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE lembretes ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

-- 4. Criar índices para performance (essencial!)
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_tenant ON veiculos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_servicos_tenant ON servicos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_tenant ON orcamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_tenant ON ordens_servico(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant ON agendamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_tenant ON contas_pagar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_tenant ON lembretes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_tenant ON notas_fiscais(tenant_id);
CREATE INDEX IF NOT EXISTS idx_empresas_tenant ON empresas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id);

-- 5. Para dados existentes: criar um tenant padrão
INSERT INTO tenants (slug, nome, email, status, plano)
VALUES ('oficina-principal', 'Oficina Principal', 'admin@oficina.com', 'active', 'premium')
ON CONFLICT (slug) DO NOTHING;

-- 6. Atualizar registros existentes com o tenant padrão (se houver dados)
-- ATENÇÃO: Só executar se já tiver dados no banco!
DO $$
DECLARE
  default_tenant_id INTEGER;
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'oficina-principal';
  
  IF default_tenant_id IS NOT NULL THEN
    UPDATE clientes SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE veiculos SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE produtos SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE servicos SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE orcamentos SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE ordens_servico SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE agendamentos SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE contas_pagar SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE lembretes SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE notas_fiscais SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
    UPDATE empresas SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- 7. Tornar tenant_id NOT NULL após popular os dados
-- DESCOMENTE APÓS POPULAR OS DADOS EXISTENTES:
-- ALTER TABLE clientes ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE veiculos ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE produtos ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE servicos ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE orcamentos ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE ordens_servico ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE agendamentos ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE contas_pagar ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE lembretes ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE notas_fiscais ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE empresas ALTER COLUMN tenant_id SET NOT NULL;

-- 8. Adicionar constraints de unicidade compostas (importante!)
-- Garantir que códigos sejam únicos por tenant, não globalmente
DROP INDEX IF EXISTS produtos_codigo_key;
DROP INDEX IF EXISTS servicos_codigo_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_codigo_tenant ON produtos(codigo, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_servicos_codigo_tenant ON servicos(codigo, tenant_id);

-- 9. (Opcional) Row Level Security - máxima segurança
-- DESCOMENTE PARA ATIVAR RLS:
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_policy ON clientes
--   USING (tenant_id = current_setting('app.current_tenant')::INTEGER);
-- Repetir para todas as tabelas...

COMMENT ON TABLE tenants IS 'Tabela de organizações/oficinas (multi-tenant)';
COMMENT ON TABLE usuarios IS 'Usuários do sistema com tenant isolation';
