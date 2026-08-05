-- Amplia chave_acesso: Notaas/chNFSe nacional pode passar de 60 caracteres
-- (antes VARCHAR(60) → 500 no UPDATE ao consultar status issued).

BEGIN;

ALTER TABLE notas_fiscais
  ALTER COLUMN chave_acesso TYPE TEXT;

ALTER TABLE notas_fiscais
  ALTER COLUMN id_provedor TYPE TEXT;

COMMIT;
