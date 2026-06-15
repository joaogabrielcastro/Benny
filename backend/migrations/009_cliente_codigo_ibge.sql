-- Código IBGE do município do cliente (tomador) — deve bater com o CEP na NFS-e/NF-e
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS codigo_ibge VARCHAR(7);
