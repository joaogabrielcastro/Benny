-- B1: Pagamentos de OS (recebimentos e contas a receber)
CREATE TABLE IF NOT EXISTS os_pagamentos (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  os_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  valor DECIMAL(12,2) NOT NULL CHECK (valor > 0),
  forma_pagamento VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Recebido',
  data_vencimento DATE,
  data_pagamento DATE,
  observacoes TEXT,
  usuario_id INTEGER,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_os_pagamentos_status CHECK (status IN ('Recebido', 'Pendente'))
);

CREATE INDEX IF NOT EXISTS idx_os_pagamentos_tenant_os ON os_pagamentos(tenant_id, os_id);
CREATE INDEX IF NOT EXISTS idx_os_pagamentos_tenant_status ON os_pagamentos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_os_pagamentos_data_pagamento ON os_pagamentos(tenant_id, data_pagamento);

-- B6: Categoria e tempo estimado em serviços; categoria em produtos
ALTER TABLE servicos
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(80),
  ADD COLUMN IF NOT EXISTS tempo_estimado_min INTEGER;

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(80);

-- B7: Responsável técnico vinculado a usuário (texto livre preservado)
ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS responsavel_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

-- B3/B5: índices de apoio
CREATE INDEX IF NOT EXISTS idx_ordens_servico_tenant_finalizado ON ordens_servico(tenant_id, finalizado_em);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_tenant_produto ON movimentacoes_estoque(tenant_id, produto_id, criado_em DESC);
