-- Notas fiscais reais (integração Nuvem Fiscal): modelo de dados e vínculo com OS
-- Execute após 003_remove_nf_gateway_tables.sql se aplicável.

BEGIN;

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
        CONSTRAINT uq_notas_fiscais_tenant_os_modelo UNIQUE (tenant_id, ordem_servico_id, modelo_documento)
);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_tenant ON notas_fiscais(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status ON notas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_provedor_id ON notas_fiscais(id_provedor);

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS nf_id INTEGER REFERENCES notas_fiscais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_nf_id ON ordens_servico(nf_id);

COMMIT;
