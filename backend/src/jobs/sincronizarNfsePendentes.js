import { resolveFiscalProvider } from "../services/fiscal/providers/index.js";
import { camposFromRespostaNuvem } from "../services/notasFiscais/nuvemRespostaParser.js";
import { persistirAtualizacaoNf } from "../services/notasFiscais/notasFiscaisRepository.js";

const LOTE = 10;

/**
 * Consulta NFS-e Notaas que ficaram em processamento.
 * Uma transação curta reserva o lote com FOR UPDATE SKIP LOCKED.
 * O HTTP acontece depois, fora da transação.
 */
export async function sincronizarNfsePendentes(db) {
  const client = await db.connect();
  let notas = [];
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `WITH candidatos AS (
         SELECT id
         FROM notas_fiscais
         WHERE status = 'processamento'
           AND modelo_documento = 'NFSE'
           AND (provedor IS NULL OR provedor IN ('notaas', 'nuvem_fiscal', 'acbr', 'acbr_api'))
           AND id_provedor IS NOT NULL
           AND atualizado_em < NOW() - INTERVAL '90 seconds'
         ORDER BY atualizado_em
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE notas_fiscais n
       SET atualizado_em = NOW()
       FROM candidatos c
       WHERE n.id = c.id
       RETURNING n.*`,
      [LOTE],
    );
    await client.query("COMMIT");
    notas = r.rows;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }

  for (const nf of notas) {
    try {
      const provider = await resolveFiscalProvider({
        modeloDocumento: "NFSE",
        provedor: nf.provedor,
        tenantId: nf.tenant_id,
      });
      if (!provider.isConfigured()) continue;
      const consulta = await provider.consultar(nf.id_provedor);
      if (!consulta.ok || consulta.confirmadoExternamente === false) continue;
      const campos = camposFromRespostaNuvem(
        consulta.data,
        Number(nf.valor_total) || 0,
        "NFSE",
        provider.rotulo,
      );
      await persistirAtualizacaoNf(
        nf.id,
        nf.tenant_id,
        nf.ordem_servico_id,
        { ...campos, idProvedor: campos.idProvedor || nf.id_provedor },
        "NFSE",
      );
    } catch (err) {
      console.error(`[ERROR] NFS-e ${nf.id} em processamento:`, err.message);
    }
  }
}
