-- ASE 5.2 / BENNY-DB-001
-- Isolamento de movimentações: tenant_id derivado do produto (sem duplicar lógica de negócio).
-- Backfill a partir de produtos.tenant_id; novas linhas devem preencher tenant_id.

ALTER TABLE movimentacoes_estoque
  ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

UPDATE movimentacoes_estoque m
SET tenant_id = p.tenant_id
FROM produtos p
WHERE m.produto_id = p.id
  AND (m.tenant_id IS DISTINCT FROM p.tenant_id);

-- Movimentações órfãs sem produto: remove (não deveriam existir)
DELETE FROM movimentacoes_estoque WHERE produto_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_tenant
  ON movimentacoes_estoque (tenant_id);

-- Não força NOT NULL ainda: deploys legados podem ter produtos sem tenant_id.
-- A aplicação passa a gravar tenant_id em toda baixa/entrada.
