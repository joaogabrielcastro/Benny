import pool from "../config/database.js";
import nfGatewayAdapter from "../adapters/nfGatewayAdapter.js";
import path from "path";
import storage from "../lib/storage.js";
import logger from "../config/logger.js";

// Worker simples que busca jobs pendentes e processa emission de NF
const POLL_INTERVAL_MS = parseInt(process.env.NF_WORKER_POLL_MS || "3000");
const MAX_ATTEMPTS = parseInt(process.env.NF_WORKER_MAX_ATTEMPTS || "5");

async function processJob(job) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // marcar job como processing
    await client.query(
      "UPDATE nf_jobs SET status = 'processing', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1",
      [job.id],
    );

    const payload = job.payload;

    // Chamar provider
    let providerResult = null;
    try {
      providerResult = await nfGatewayAdapter.emitirNota(
        payload,
        payload.empresaConfig,
      );

      // Salvar arquivos se retornados usando módulo de storage (local ou S3)
      let pdfPath = null;
      let xmlPath = null;

      if (providerResult?.pdfBase64) {
        const r = await storage.saveFile(
          providerResult.pdfBase64,
          `nf_${payload.id}.pdf`,
        );
        pdfPath = r.path;
      }

      if (providerResult?.xmlBase64) {
        const r = await storage.saveFile(
          providerResult.xmlBase64,
          `nf_${payload.id}.xml`,
        );
        xmlPath = r.path;
      }

      // Atualizar notas_fiscais com paths e número retornado
      const providerNumero = providerResult?.numero || payload.numero_interno;
      await client.query(
        `UPDATE notas_fiscais SET numero = $1, pdf_path = $2, xml_path = $3 WHERE id = $4`,
        [providerNumero, pdfPath, xmlPath, payload.id],
      );

      // Inserir histórico
      await client.query(
        `INSERT INTO notas_fiscais_historico (nota_fiscal_id, status, mensagem) VALUES ($1, $2, $3)`,
        [
          payload.id,
          providerResult.status || "emitida",
          JSON.stringify(providerResult.providerResponse || {}),
        ],
      );

      // Marcar job como done
      await client.query(
        "UPDATE nf_jobs SET status = 'done', atualizado_em = CURRENT_TIMESTAMP WHERE id = $1",
        [job.id],
      );

      await client.query("COMMIT");

      logger.info(`Job NF ${payload.id} processado com sucesso`);
    } catch (err) {
      // incrementar tentativas e calcular backoff
      const attempts = (job.attempts || 0) + 1;
      const backoffSeconds = Math.pow(2, attempts - 1) * 60; // 1m,2m,4m,...

      if (attempts >= MAX_ATTEMPTS) {
        // mover para DLQ
        await client.query(
          `INSERT INTO nf_jobs_dlq (original_job_id, nota_fiscal_id, payload, attempts, last_error) VALUES ($1,$2,$3,$4,$5)`,
          [job.id, payload.id, payload, attempts, String(err.message || err)],
        );

        await client.query("DELETE FROM nf_jobs WHERE id = $1", [job.id]);

        await client.query(
          `INSERT INTO notas_fiscais_historico (nota_fiscal_id, status, mensagem) VALUES ($1, $2, $3)`,
          [
            payload.id,
            "failed",
            `Moved to DLQ after ${attempts} attempts: ${String(err.message || err)}`,
          ],
        );
      } else {
        const nextRunAt = new Date(Date.now() + backoffSeconds * 1000);
        await client.query(
          `UPDATE nf_jobs SET attempts = $1, last_error = $2, next_run_at = $3, status = 'pending', atualizado_em = CURRENT_TIMESTAMP WHERE id = $4`,
          [attempts, String(err.message || err), nextRunAt, job.id],
        );

        await client.query(
          `INSERT INTO notas_fiscais_historico (nota_fiscal_id, status, mensagem) VALUES ($1, $2, $3)`,
          [
            payload.id,
            "retry_scheduled",
            `Attempt ${attempts}: ${String(err.message || err)}`,
          ],
        );
      }

      await client.query("COMMIT");

      logger.error(`Erro processando job NF ${payload.id}:`, err);
    }
  } catch (outerErr) {
    logger.error("Erro no worker ao processar job:", outerErr);
    try {
      await client.query("ROLLBACK");
    } catch (e) {}
  } finally {
    client.release();
  }
}

async function pollLoop() {
  while (true) {
    try {
      const res = await pool.query(
        `SELECT * FROM nf_jobs WHERE status = 'pending' AND (next_run_at IS NULL OR next_run_at <= NOW()) ORDER BY criado_em ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
      );

      if (res.rows.length === 0) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      const job = res.rows[0];
      // job.payload is stored as JSONB but may be returned as object
      await processJob(job);
    } catch (err) {
      logger.error("Erro no loop do worker:", err);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

logger.info("Iniciando NF worker...");
pollLoop();

export default { pollLoop };
