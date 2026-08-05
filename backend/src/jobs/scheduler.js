import schedule from "node-schedule";
import {
  SINGLE_TENANT_ID,
  SINGLE_TENANT_MODE,
} from "../config/singleTenant.js";
import backupService from "../services/backupService.js";
import pool from "../../database.js";

// ─── Backup automático ───────────────────────────────────────────────────────

async function realizarBackupAutomatico() {
  try {
    console.log("[INFO] Iniciando backup automático...");
    // Dump completo do banco (todos os tenants no SaaS)
    const result = await backupService.realizar(SINGLE_TENANT_ID);
    console.log(
      `[INFO] Backup automático concluído (${result.metodo}): ${result.file} (${result.size} bytes)`,
    );
  } catch (error) {
    console.error("[ERROR] Erro no backup automático:", error.message);
  }
}

// ─── Processamento de lembretes ──────────────────────────────────────────────

async function processarLembretesPendentes(db) {
  try {
    const hoje = new Date();
    const params = [hoje];
    let tenantClause = "";
    if (SINGLE_TENANT_MODE) {
      tenantClause = "AND l.tenant_id = $2";
      params.push(SINGLE_TENANT_ID);
    }

    const lembretes = await db.query(
      `SELECT l.*,
              CASE
                WHEN l.tipo = 'agendamento' THEN
                  json_build_object(
                    'cliente_nome', (SELECT c.nome FROM agendamentos a JOIN clientes c ON a.cliente_id = c.id WHERE a.id = l.referencia_id),
                    'tipo_servico', (SELECT tipo_servico FROM agendamentos WHERE id = l.referencia_id),
                    'data_agendamento', (SELECT data_agendamento FROM agendamentos WHERE id = l.referencia_id),
                    'hora_inicio', (SELECT hora_inicio FROM agendamentos WHERE id = l.referencia_id)
                  )
                WHEN l.tipo = 'conta_pagar' THEN
                  json_build_object(
                    'descricao', (SELECT descricao FROM contas_pagar WHERE id = l.referencia_id),
                    'valor', (SELECT valor FROM contas_pagar WHERE id = l.referencia_id),
                    'data_vencimento', (SELECT data_vencimento FROM contas_pagar WHERE id = l.referencia_id)
                  )
              END as dados_referencia
       FROM lembretes l
       WHERE l.data_lembrete <= $1 AND l.enviado = false ${tenantClause}
       ORDER BY l.prioridade DESC, l.data_lembrete ASC`,
      params,
    );

    if (lembretes.rows.length === 0) return;

    console.log(`[INFO] ${lembretes.rows.length} lembrete(s) pendente(s)`);

    for (const lembrete of lembretes.rows) {
      try {
        console.log(
          `[INFO] Lembrete: ${lembrete.titulo} | ${lembrete.mensagem}`,
        );

        await db.query(
          `UPDATE lembretes SET enviado = true, data_envio = CURRENT_TIMESTAMP WHERE id = $1`,
          [lembrete.id],
        );
      } catch (err) {
        console.error(
          `[ERROR] Erro ao processar lembrete ${lembrete.id}:`,
          err.message,
        );
      }
    }
  } catch (error) {
    console.error("[ERROR] Erro ao processar lembretes:", error.message);
  }
}

// ─── Geração de contas recorrentes ───────────────────────────────────────────

function addInterval(dateStr, freq, intv) {
  const d = new Date(dateStr);
  const n = parseInt(intv, 10) || 1;
  switch ((freq || "").toLowerCase()) {
    case "diario":
    case "diária":
    case "diaria":
      d.setDate(d.getDate() + n);
      break;
    case "semanal":
    case "semanalmente":
      d.setDate(d.getDate() + 7 * n);
      break;
    case "anual":
    case "anualmente":
      d.setFullYear(d.getFullYear() + n);
      break;
    default:
      d.setMonth(d.getMonth() + n);
  }
  return d;
}

async function gerarContasRecorrentes(db) {
  try {
    const hoje = new Date();
    const params = [hoje];
    let tenantClause = "";
    if (SINGLE_TENANT_MODE) {
      tenantClause = "AND tenant_id = $2";
      params.push(SINGLE_TENANT_ID);
    }

    const resTemplates = await db.query(
      `SELECT * FROM contas_pagar WHERE recorrente = true AND data_vencimento <= $1 ${tenantClause}`,
      params,
    );

    if (resTemplates.rows.length === 0) return;

    console.log(
      `[INFO] Processando ${resTemplates.rows.length} conta(s) recorrente(s)`,
    );

    for (const tpl of resTemplates.rows) {
      try {
        let currentDue = new Date(tpl.data_vencimento);

        while (currentDue <= hoje) {
          const insertRes = await db.query(
            `INSERT INTO contas_pagar (tenant_id, descricao, categoria, valor, data_vencimento, fornecedor, forma_pagamento, observacoes, recorrente, recorrencia_origem_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9) RETURNING *`,
            [
              tpl.tenant_id,
              tpl.descricao,
              tpl.categoria,
              tpl.valor,
              currentDue,
              tpl.fornecedor || null,
              tpl.forma_pagamento || null,
              tpl.observacoes || null,
              tpl.id,
            ],
          );

          const dataLembrete = new Date(currentDue);
          dataLembrete.setDate(dataLembrete.getDate() - 3);
          dataLembrete.setHours(9, 0, 0, 0);

          await db.query(
            `INSERT INTO lembretes (tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade, tenant_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              "conta_pagar",
              insertRes.rows[0].id,
              "Lembrete de Pagamento",
              `Conta a vencer em 3 dias: ${tpl.descricao} - ${tpl.valor}`,
              dataLembrete,
              "alta",
              tpl.tenant_id,
            ],
          );

          const next = addInterval(currentDue, tpl.frequencia, tpl.intervalo);

          if (tpl.data_termino && next > new Date(tpl.data_termino)) {
            await db.query(
              `UPDATE contas_pagar SET recorrente = false WHERE id = $1`,
              [tpl.id],
            );
            break;
          }

          await db.query(
            `UPDATE contas_pagar SET data_vencimento = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2`,
            [next, tpl.id],
          );

          currentDue = new Date(next);
        }
      } catch (err) {
        console.error(
          `[ERROR] Erro ao processar recorrência ${tpl.id}:`,
          err.message,
        );
      }
    }
  } catch (error) {
    console.error("[ERROR] Erro ao gerar contas recorrentes:", error.message);
  }
}

// ─── Inicializador ───────────────────────────────────────────────────────────

export function initScheduler(db = pool) {
  schedule.scheduleJob("0 2 * * *", () => realizarBackupAutomatico());
  console.log("[INFO] Backup automático agendado às 02:00 diariamente");

  schedule.scheduleJob("*/30 * * * *", () => processarLembretesPendentes(db));
  setTimeout(() => processarLembretesPendentes(db), 5000);
  console.log("[INFO] Verificação de lembretes agendada a cada 30 minutos");

  schedule.scheduleJob("0 0 * * *", () => gerarContasRecorrentes(db));
  setTimeout(() => gerarContasRecorrentes(db), 8000);
  console.log(
    "[INFO] Geração de contas recorrentes agendada às 00:00 diariamente",
  );
}
