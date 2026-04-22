-- Migration: Remove stack legado de NF/Gateway
-- Objetivo:
-- 1) Remover coluna legada nf_id de ordens_servico
-- 2) Remover tabelas de NF/Gateway que nao sao mais usadas

BEGIN;

-- 1) Remover coluna legada de vinculo de NF na OS
ALTER TABLE IF EXISTS ordens_servico
  DROP COLUMN IF EXISTS nf_id;

-- 2) Remover tabelas legadas (ordem por dependencia)
DROP TABLE IF EXISTS nf_jobs_dlq;
DROP TABLE IF EXISTS nf_jobs;
DROP TABLE IF EXISTS notas_fiscais_historico;
DROP TABLE IF EXISTS gateway_configs;
DROP TABLE IF EXISTS notas_fiscais;
DROP TABLE IF EXISTS empresas;

COMMIT;
