-- Índices de FK e listagens frequentes (idempotente)
CREATE INDEX IF NOT EXISTS idx_orcamento_produtos_orcamento_id ON orcamento_produtos(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_servicos_orcamento_id ON orcamento_servicos(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_os_produtos_os_id ON os_produtos(os_id);
CREATE INDEX IF NOT EXISTS idx_os_servicos_os_id ON os_servicos(os_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente_id ON veiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_os_id ON movimentacoes_estoque(os_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_orcamento_id ON movimentacoes_estoque(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_criado_em ON ordens_servico(criado_em DESC);
