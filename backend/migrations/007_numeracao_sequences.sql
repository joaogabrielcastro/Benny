-- Numeração atômica ORC/OS (single-tenant; sequences globais sincronizadas com o máximo existente)

CREATE SEQUENCE IF NOT EXISTS seq_orcamento_numero;

SELECT setval(
  'seq_orcamento_numero',
  GREATEST(
    1,
    COALESCE(
      (SELECT MAX(SUBSTRING(numero FROM 5)::integer)
       FROM orcamentos
       WHERE numero ~ '^ORC-[0-9]+$'),
      0
    ) + 1
  ),
  false
);

CREATE SEQUENCE IF NOT EXISTS seq_os_numero;

SELECT setval(
  'seq_os_numero',
  GREATEST(
    1,
    COALESCE(
      (SELECT MAX(SUBSTRING(numero FROM 4)::integer)
       FROM ordens_servico
       WHERE numero ~ '^OS-[0-9]+$'),
      0
    ) + 1
  ),
  false
);
