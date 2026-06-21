-- NCM do produto (8 dígitos) — usado na NF-e / DANFE
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS ncm VARCHAR(8);
