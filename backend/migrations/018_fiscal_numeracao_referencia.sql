-- Numeração fiscal por tenant/modelo/série e referência estável da emissão.
-- Não apaga notas e não reinicia números já usados: o primeiro uso
-- calcula o próximo a partir de notas_fiscais + NOTAAS_NFE_NUMERO_INICIAL.

BEGIN;

CREATE TABLE IF NOT EXISTS fiscal_numeracao (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  modelo_documento VARCHAR(20) NOT NULL,
  serie INTEGER NOT NULL,
  proximo_numero INTEGER NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_fiscal_numeracao_tenant_modelo_serie
    UNIQUE (tenant_id, modelo_documento, serie)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_numeracao_tenant
  ON fiscal_numeracao(tenant_id);

ALTER TABLE notas_fiscais
  ADD COLUMN IF NOT EXISTS referencia_externa VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notas_fiscais_referencia_externa
  ON notas_fiscais (tenant_id, referencia_externa)
  WHERE referencia_externa IS NOT NULL;

COMMIT;
