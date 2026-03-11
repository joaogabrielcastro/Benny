import pool from "../../database.js";

/**
 * Registra uma entrada na tabela de auditoria.
 * Aceita um client de transação opcional; se omitido, usa o pool diretamente.
 */
export async function registrarAuditoria(
  tabela,
  registroId,
  acao,
  dadosAnteriores,
  dadosNovos,
  usuario = "sistema",
  client = pool,
) {
  try {
    await client.query(
      `INSERT INTO auditoria (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario)
       VALUES ($1, $2::integer, $3, $4::jsonb, $5::jsonb, $6)`,
      [
        tabela,
        registroId,
        acao,
        JSON.stringify(dadosAnteriores),
        JSON.stringify(dadosNovos),
        usuario,
      ],
    );
  } catch (error) {
    console.error("[ERROR] Falha ao registrar auditoria:", error.message);
  }
}
