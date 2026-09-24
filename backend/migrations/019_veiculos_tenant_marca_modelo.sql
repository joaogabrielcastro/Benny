-- Casos semelhantes: mesma oficina, mesma marca e modelo normalizados.
CREATE INDEX IF NOT EXISTS idx_veiculos_tenant_marca_modelo
  ON veiculos (tenant_id, lower(trim(marca)), lower(trim(modelo)));
