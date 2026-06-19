-- Permite NFS-e e NF-e na mesma OS (um registro por modelo)
ALTER TABLE notas_fiscais
  DROP CONSTRAINT IF EXISTS uq_notas_fiscais_tenant_os;

ALTER TABLE notas_fiscais
  ADD CONSTRAINT uq_notas_fiscais_tenant_os_modelo
  UNIQUE (tenant_id, ordem_servico_id, modelo_documento);

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS nf_nfe_id INTEGER REFERENCES notas_fiscais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_nf_nfe_id ON ordens_servico(nf_nfe_id);
