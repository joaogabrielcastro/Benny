import schedule from "node-schedule";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, "../../backups");

// ─── Backup automático ───────────────────────────────────────────────────────

async function realizarBackupAutomatico(pool) {
  try {
    console.log("[INFO] Iniciando backup automático...");

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(BACKUP_DIR, `backup-auto-${timestamp}.json`);

    const [produtos, clientes, veiculos, orcamentos, ordens] =
      await Promise.all([
        pool.query("SELECT * FROM produtos"),
        pool.query("SELECT * FROM clientes"),
        pool.query("SELECT * FROM veiculos"),
        pool.query("SELECT * FROM orcamentos"),
        pool.query("SELECT * FROM ordens_servico"),
      ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      database: "benny_motorsport",
      tipo: "automatico",
      tables: {
        produtos: produtos.rows,
        clientes: clientes.rows,
        veiculos: veiculos.rows,
        orcamentos: orcamentos.rows,
        ordens_servico: ordens.rows,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    // Manter apenas os últimos 10 backups
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
      .map((f) => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        created: fs.statSync(path.join(BACKUP_DIR, f)).birthtime,
      }))
      .sort((a, b) => b.created - a.created);

    if (files.length > 10) {
      files.slice(10).forEach((f) => fs.unlinkSync(f.path));
    }

    console.log(`[INFO] Backup automático concluído: ${backupFile}`);
  } catch (error) {
    console.error("[ERROR] Erro no backup automático:", error.message);
  }
}

// ─── Processamento de lembretes ──────────────────────────────────────────────

async function processarLembretesPendentes(pool) {
  try {
    const hoje = new Date();
    const lembretes = await pool.query(
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
       WHERE l.data_lembrete <= $1 AND l.enviado = false
       ORDER BY l.prioridade DESC, l.data_lembrete ASC`,
      [hoje],
    );

    if (lembretes.rows.length === 0) return;

    console.log(`[INFO] ${lembretes.rows.length} lembrete(s) pendente(s)`);

    for (const lembrete of lembretes.rows) {
      try {
        console.log(
          `[INFO] Lembrete: ${lembrete.titulo} | ${lembrete.mensagem}`,
        );

        await pool.query(
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

async function gerarContasRecorrentes(pool) {
  try {
    const hoje = new Date();
    const resTemplates = await pool.query(
      `SELECT * FROM contas_pagar WHERE recorrente = true AND data_vencimento <= $1`,
      [hoje],
    );

    if (resTemplates.rows.length === 0) return;

    console.log(
      `[INFO] Processando ${resTemplates.rows.length} conta(s) recorrente(s)`,
    );

    for (const tpl of resTemplates.rows) {
      try {
        let currentDue = new Date(tpl.data_vencimento);

        while (currentDue <= hoje) {
          const insertRes = await pool.query(
            `INSERT INTO contas_pagar (descricao, categoria, valor, data_vencimento, fornecedor, forma_pagamento, observacoes, recorrente, recorrencia_origem_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8) RETURNING *`,
            [
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

          await pool.query(
            `INSERT INTO lembretes (tipo, referencia_id, titulo, mensagem, data_lembrete, prioridade)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              "conta_pagar",
              insertRes.rows[0].id,
              "Lembrete de Pagamento",
              `Conta a vencer em 3 dias: ${tpl.descricao} - ${tpl.valor}`,
              dataLembrete,
              "alta",
            ],
          );

          const next = addInterval(currentDue, tpl.frequencia, tpl.intervalo);

          if (tpl.data_termino && next > new Date(tpl.data_termino)) {
            await pool.query(
              `UPDATE contas_pagar SET recorrente = false WHERE id = $1`,
              [tpl.id],
            );
            break;
          }

          await pool.query(
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

export function initScheduler(pool) {
  // Backup diário às 2h
  schedule.scheduleJob("0 2 * * *", () => realizarBackupAutomatico(pool));
  console.log("[INFO] Backup automático agendado às 02:00 diariamente");

  // Lembretes a cada 30 minutos
  schedule.scheduleJob("*/30 * * * *", () => processarLembretesPendentes(pool));
  setTimeout(() => processarLembretesPendentes(pool), 5000);
  console.log("[INFO] Verificação de lembretes agendada a cada 30 minutos");

  // Contas recorrentes diariamente à meia-noite
  schedule.scheduleJob("0 0 * * *", () => gerarContasRecorrentes(pool));
  setTimeout(() => gerarContasRecorrentes(pool), 8000);
  console.log(
    "[INFO] Geração de contas recorrentes agendada às 00:00 diariamente",
  );
}
