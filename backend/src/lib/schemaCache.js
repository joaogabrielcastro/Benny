let cacheProdutosNcm = null;

/** Verifica se a coluna produtos.ncm existe (cache em memória). */
export async function produtosTemColunaNcm(pool) {
  if (cacheProdutosNcm !== null) return cacheProdutosNcm;
  const { rows } = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'produtos'
        AND column_name = 'ncm'
    ) AS ok
  `);
  cacheProdutosNcm = Boolean(rows[0]?.ok);
  return cacheProdutosNcm;
}

export function resetSchemaCache() {
  cacheProdutosNcm = null;
}
