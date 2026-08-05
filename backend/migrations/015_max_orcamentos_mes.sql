-- Migration: alinhar max_orcamentos_mes aos planos SaaS
BEGIN;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS max_orcamentos_mes INTEGER DEFAULT 100;

UPDATE tenants
SET max_orcamentos_mes = CASE LOWER(COALESCE(plano, 'basic'))
  WHEN 'basic' THEN 50
  WHEN 'premium' THEN 200
  WHEN 'enterprise' THEN 9999
  ELSE COALESCE(max_orcamentos_mes, 50)
END;

COMMIT;
