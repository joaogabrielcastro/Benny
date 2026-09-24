import { getNuvemFiscalConfig } from "../../config/nuvemFiscal.js";

/**
 * Reserva o próximo número de NF-e numa transação curta.
 * A transação termina antes de qualquer HTTP.
 *
 * Falha depois da reserva deixa lacuna de propósito: o número não volta
 * para a fila. Inutilização fiscal não faz parte desta fase.
 * Retry da mesma nota reutiliza o número já gravado em notas_fiscais.numero
 * e não chama esta função de novo.
 */
export function calcularProximoNumeroNfe(maxNum, inicio = 1) {
  const piso = Math.max(1, Number(inicio) || 1);
  const max = Number(maxNum) || 0;
  return Math.max(max, piso - 1) + 1;
}

const SQL_MAX = `
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(COALESCE(numero, ''), '\\D', '', 'g'), '')::integer
  ), 0) AS max_num
  FROM notas_fiscais
  WHERE tenant_id = $1
    AND modelo_documento = 'NFE'
    AND (
      (dados_envio->'infNFe'->'ide'->>'serie')::integer = $2
      OR COALESCE((dados_envio->>'serie')::integer, $2) = $2
      OR (serie ~ '^[0-9]+$' AND serie::integer = $2)
    )`;

export async function reservarProximoNumeroNfe(tenantId, serie, db) {
  const pool = db || (await import("../../../database.js")).default;
  const client = await pool.connect();
  const serieNum = Number(serie) || 1;
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      `SELECT proximo_numero
       FROM fiscal_numeracao
       WHERE tenant_id = $1 AND modelo_documento = 'NFE' AND serie = $2
       FOR UPDATE`,
      [tenantId, serieNum],
    );

    if (!locked.rows[0]) {
      const cfg = getNuvemFiscalConfig();
      const maxRes = await client.query(SQL_MAX, [tenantId, serieNum]);
      const proximo = calcularProximoNumeroNfe(
        maxRes.rows[0]?.max_num,
        cfg.nfeNumeroInicial,
      );
      await client.query(
        `INSERT INTO fiscal_numeracao
           (tenant_id, modelo_documento, serie, proximo_numero)
         VALUES ($1, 'NFE', $2, $3)
         ON CONFLICT (tenant_id, modelo_documento, serie) DO NOTHING`,
        [tenantId, serieNum, proximo],
      );
      await client.query(
        `SELECT proximo_numero
         FROM fiscal_numeracao
         WHERE tenant_id = $1 AND modelo_documento = 'NFE' AND serie = $2
         FOR UPDATE`,
        [tenantId, serieNum],
      );
    }

    const upd = await client.query(
      `UPDATE fiscal_numeracao
       SET proximo_numero = proximo_numero + 1,
           atualizado_em = NOW()
       WHERE tenant_id = $1 AND modelo_documento = 'NFE' AND serie = $2
       RETURNING (proximo_numero - 1) AS numero`,
      [tenantId, serieNum],
    );
    await client.query("COMMIT");
    const numero = Number(upd.rows[0]?.numero);
    if (!Number.isFinite(numero) || numero < 1) {
      throw new Error("Falha ao reservar número da NF-e.");
    }
    return numero;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* transação já encerrada */
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Compatibilidade: reservar é a única forma de obter número novo. */
export async function obterProximoNumeroNfe(tenantId, serie) {
  return reservarProximoNumeroNfe(tenantId, serie);
}

export function numeroJaReservado(nf) {
  const digits = String(nf?.numero || "").replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}
