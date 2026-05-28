/** Cliente pg (pool ou transaction). */
function queryable(clientOrPool) {
  if (clientOrPool?.query) return clientOrPool;
  throw new Error("Cliente de banco inválido para numeração");
}

let ensurePromise = null;

/** Idempotente: cria sequences e sincroniza com o maior número já usado. */
export async function ensureNumeracaoSequences(clientOrPool) {
  if (!ensurePromise) {
    const q = queryable(clientOrPool);
    ensurePromise = (async () => {
      await q.query("CREATE SEQUENCE IF NOT EXISTS seq_orcamento_numero");
      await q.query(`
        SELECT setval(
          'seq_orcamento_numero',
          GREATEST(
            1,
            COALESCE(
              (SELECT MAX(SUBSTRING(numero FROM 5)::integer)
               FROM orcamentos WHERE numero ~ '^ORC-[0-9]+$'),
              0
            ) + 1
          ),
          false
        )
      `);
      await q.query("CREATE SEQUENCE IF NOT EXISTS seq_os_numero");
      await q.query(`
        SELECT setval(
          'seq_os_numero',
          GREATEST(
            1,
            COALESCE(
              (SELECT MAX(SUBSTRING(numero FROM 4)::integer)
               FROM ordens_servico WHERE numero ~ '^OS-[0-9]+$'),
              0
            ) + 1
          ),
          false
        )
      `);
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  await ensurePromise;
}

export function formatarNumeroOrcamento(n) {
  return `ORC-${String(n).padStart(4, "0")}`;
}

export function formatarNumeroOS(n) {
  return `OS-${String(n).padStart(4, "0")}`;
}

export async function proximoNumeroOrcamento(clientOrPool) {
  await ensureNumeracaoSequences(clientOrPool);
  const { rows } = await queryable(clientOrPool).query(
    "SELECT nextval('seq_orcamento_numero')::bigint AS n",
  );
  return formatarNumeroOrcamento(rows[0].n);
}

export async function proximoNumeroOS(clientOrPool) {
  await ensureNumeracaoSequences(clientOrPool);
  const { rows } = await queryable(clientOrPool).query(
    "SELECT nextval('seq_os_numero')::bigint AS n",
  );
  return formatarNumeroOS(rows[0].n);
}
