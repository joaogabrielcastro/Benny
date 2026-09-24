-- Histórico do assistente: últimas OS de um veículo dentro do tenant.
CREATE INDEX IF NOT EXISTS idx_ordens_servico_tenant_veiculo
  ON ordens_servico (tenant_id, veiculo_id, criado_em DESC);
