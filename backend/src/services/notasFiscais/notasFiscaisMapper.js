import { extrairStatusBrutoNuvem } from "./nuvemRespostaParser.js";

/** Formato esperado pelo modal em OSDetalhes.jsx */
export function mapNfParaRespostaApi(row) {
  if (!row) return null;

  const t =
    typeof row.tributos === "object" && row.tributos !== null
      ? row.tributos
      : {};

  const emissao = row.data_emissao || row.criado_em;
  const dr =
    typeof row.dados_resposta === "object" && row.dados_resposta !== null
      ? row.dados_resposta
      : typeof row.dados_resposta === "string"
        ? (() => {
            try {
              return JSON.parse(row.dados_resposta);
            } catch {
              return {};
            }
          })()
        : {};

  const statusProvedor = extrairStatusBrutoNuvem(dr);

  let numero = row.numero;
  if (!numero) {
    if (row.status === "autorizada") numero = "—";
    else if (row.status === "configuracao_pendente")
      numero = "Configuração pendente";
    else if (row.status === "processamento") numero = "Em processamento";
    else if (row.status === "erro_autenticacao") numero = "Erro de autenticação";
    else if (row.status === "rejeitada") numero = "Rejeitada";
    else if (row.status === "cancelada") numero = "Cancelada";
    else if (row.status === "substituida") numero = "Substituída";
    else numero = `Registro #${row.id}`;
  }

  return {
    id: row.id,
    numero,
    status_nf: row.status,
    data_emissao: emissao,
    valor_base: Number(t.valor_base ?? row.valor_total ?? 0),
    valor_icms: Number(t.valor_icms ?? 0),
    valor_iss: Number(t.valor_iss ?? 0),
    valor_pis: Number(t.valor_pis ?? 0),
    valor_cofins: Number(t.valor_cofins ?? 0),
    valor_liquido: Number(t.valor_liquido ?? row.valor_total ?? 0),
    valor_total: Number(row.valor_total ?? 0),
    aliquota_iss: t.aliquota_iss ?? null,
    aliquota_pis: t.aliquota_pis ?? null,
    aliquota_cofins: t.aliquota_cofins ?? null,
    fonte_iss: t.fonte_iss || null,
    fonte_pis: t.fonte_pis || null,
    fonte_cofins: t.fonte_cofins || null,
    observacoes: row.mensagem_status || null,
    link_pdf: row.link_pdf || null,
    link_xml: row.link_xml || null,
    pdf_path: row.link_pdf || null,
    id_provedor: row.id_provedor || null,
    provedor: row.provedor,
    modelo_documento: row.modelo_documento,
    chave_acesso: row.chave_acesso || null,
    status_provedor: statusProvedor,
    atualizado_em_nf: row.atualizado_em || null,
  };
}
