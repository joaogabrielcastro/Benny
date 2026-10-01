-- Amplia chave_acesso: Notaas/chNFSe nacional pode passar de 60 caracteres
-- (antes VARCHAR(60) → 500 no UPDATE ao consultar status issued).
-- Idempotente: só altera se a tabela já existir (CI/boot pode aplicar 004 depois).

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'notas_fiscais'
  ) THEN
    ALTER TABLE notas_fiscais
      ALTER COLUMN chave_acesso TYPE TEXT;
    ALTER TABLE notas_fiscais
      ALTER COLUMN id_provedor TYPE TEXT;
  END IF;
END $$;

COMMIT;
