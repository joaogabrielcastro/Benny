-- Migration: Single-tenant mode (compatibility)
-- Objetivo:
-- 1) Garantir um tenant padrao unico (id=1)
-- 2) Backfill tenant_id nas tabelas principais
-- 3) Definir DEFAULT tenant_id=1 para novas insercoes
-- 4) Ajustar unicidade de usuarios por e-mail (single-tenant)

BEGIN;

-- 1) Garantir tenant padrao
INSERT INTO tenants (id, slug, nome, email, status, plano)
VALUES (
  1,
  'default',
  'Oficina',
  COALESCE(NULLIF(current_setting('app.default_tenant_email', true), ''), 'admin@oficina.com'),
  'active',
  'basic'
)
ON CONFLICT (id) DO NOTHING;

UPDATE tenants
SET slug = 'default',
    nome = COALESCE(nome, 'Oficina'),
    email = COALESCE(email, 'admin@oficina.com'),
    status = COALESCE(status, 'active'),
    plano = COALESCE(plano, 'basic')
WHERE id = 1;

-- 2) Backfill de tenant_id para 1
UPDATE usuarios SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE clientes SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE veiculos SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE produtos SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE servicos SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE orcamentos SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE ordens_servico SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE agendamentos SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE contas_pagar SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE lembretes SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE notas_fiscais SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE empresas SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 3) DEFAULT para novas linhas
ALTER TABLE usuarios ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE clientes ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE veiculos ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE produtos ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE servicos ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE orcamentos ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE ordens_servico ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE agendamentos ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE contas_pagar ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE lembretes ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE notas_fiscais ALTER COLUMN tenant_id SET DEFAULT 1;
ALTER TABLE empresas ALTER COLUMN tenant_id SET DEFAULT 1;

-- 4) unicidade de usuarios no modo single
DROP INDEX IF EXISTS idx_usuarios_tenant;
DROP INDEX IF EXISTS idx_usuarios_email_tenant;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tenant_id_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_unique ON usuarios(email);

COMMIT;
