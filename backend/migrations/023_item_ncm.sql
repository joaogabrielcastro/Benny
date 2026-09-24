-- NCM na própria linha do orçamento e da OS, para peça sem produto de catálogo.
ALTER TABLE orcamento_produtos
  ADD COLUMN IF NOT EXISTS ncm VARCHAR(8);

ALTER TABLE os_produtos
  ADD COLUMN IF NOT EXISTS ncm VARCHAR(8);
