-- ASE 5.2 / BENNY-DB-001
-- Garante quantidade de estoque não-negativa em produtos.
-- Corrige valores inválidos existentes antes do CHECK.

UPDATE produtos
SET quantidade = 0, atualizado_em = CURRENT_TIMESTAMP
WHERE quantidade IS NOT NULL AND quantidade < 0;

ALTER TABLE produtos
  DROP CONSTRAINT IF EXISTS produtos_quantidade_nao_negativa;

ALTER TABLE produtos
  ADD CONSTRAINT produtos_quantidade_nao_negativa
  CHECK (quantidade IS NULL OR quantidade >= 0);
