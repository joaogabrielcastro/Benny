-- Numero da NFS-e/NF-e: Notaas pode retornar valor > 50 caracteres
-- (erro: value too long for type character varying(50) ao sincronizar).

BEGIN;

ALTER TABLE notas_fiscais
  ALTER COLUMN numero TYPE TEXT;

COMMIT;
