-- Chassi do veículo (preenchido manualmente ou via consulta por placa)
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS chassi VARCHAR(20);
