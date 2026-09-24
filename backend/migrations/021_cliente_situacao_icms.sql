-- Situação do destinatário perante o ICMS. Nullable: cliente antigo não vira não contribuinte.
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20),
  ADD COLUMN IF NOT EXISTS situacao_icms VARCHAR(30);
