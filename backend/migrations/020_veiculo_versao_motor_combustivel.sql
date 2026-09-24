-- Campos opcionais de identificação do veículo. Veículos antigos permanecem NULL.
ALTER TABLE veiculos
  ADD COLUMN IF NOT EXISTS versao VARCHAR(80),
  ADD COLUMN IF NOT EXISTS motor VARCHAR(80),
  ADD COLUMN IF NOT EXISTS combustivel VARCHAR(40);
