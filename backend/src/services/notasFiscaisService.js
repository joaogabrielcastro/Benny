import pool from "../../database.js";

import { SINGLE_TENANT_ID } from "../config/singleTenant.js";

import { isNuvemFiscalConfigured } from "../config/nuvemFiscal.js";

import { emitirNfseDps } from "./nuvemFiscalClient.js";

import { montarCorpoEmissaoNfseDps } from "./nuvemFiscalNfsePayload.js";

import ordensServicoService from "./ordensServicoService.js";



function tributosPadraoDaOs(valorTotal) {

  const v = Number(valorTotal) || 0;

  return {

    valor_base: v,

    valor_icms: 0,

    valor_iss: 0,

    valor_pis: 0,

    valor_cofins: 0,

  };

}



function mapStatusApiNuvemParaInterno(apiStatus) {

  if (!apiStatus) return "processamento";

  const s = String(apiStatus).toLowerCase();

  if (s === "autorizada") return "autorizada";

  if (s === "processando") return "processamento";

  if (s === "negada" || s === "erro") return "rejeitada";

  if (s === "cancelada") return "cancelada";

  if (s === "substituida") return "substituida";

  return "processamento";

}



function resumoMensagensApi(data) {

  const m = data?.mensagens;

  if (!Array.isArray(m) || !m.length) return null;

  return m

    .map((x) => x?.descricao || x?.correcao || x?.codigo)

    .filter(Boolean)

    .join("; ");

}



/** Formato esperado pelo modal legado em OSDetalhes.jsx + campos novos */

export function mapNfParaRespostaApi(row) {

  if (!row) return null;

  const t =

    typeof row.tributos === "object" && row.tributos !== null

      ? row.tributos

      : {};

  const emissao = row.data_emissao || row.criado_em;

  let numero = row.numero;

  if (!numero) {

    if (row.status === "autorizada") numero = "—";

    else if (row.status === "configuracao_pendente")

      numero = "Configuração pendente";

    else if (row.status === "processamento") numero = "Em processamento";

    else if (row.status === "erro_autenticacao")

      numero = "Erro de autenticação";

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

    valor_total: Number(row.valor_total ?? 0),

    observacoes: row.mensagem_status || null,

    link_pdf: row.link_pdf || null,

    link_xml: row.link_xml || null,

    pdf_path: row.link_pdf || null,

    id_provedor: row.id_provedor || null,

    provedor: row.provedor,

    modelo_documento: row.modelo_documento,

    chave_acesso: row.chave_acesso || null,

  };

}



const listar = async (tenantId = SINGLE_TENANT_ID) => {

  const r = await pool.query(

    `SELECT * FROM notas_fiscais WHERE tenant_id = $1 ORDER BY id DESC`,

    [tenantId],

  );

  return r.rows.map(mapNfParaRespostaApi);

};



const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {

  const r = await pool.query(

    `SELECT * FROM notas_fiscais WHERE id = $1 AND tenant_id = $2`,

    [id, tenantId],

  );

  return r.rows[0] || null;

};



const buscarPorOsId = async (tenantId = SINGLE_TENANT_ID, osId) => {

  const r = await pool.query(

    `SELECT * FROM notas_fiscais WHERE ordem_servico_id = $1 AND tenant_id = $2`,

    [osId, tenantId],

  );

  return r.rows[0] || null;

};



const gerarParaOs = async (tenantId = SINGLE_TENANT_ID, osId) => {

  const osCompleta = await ordensServicoService.buscarPorId(tenantId, osId);

  if (!osCompleta) {

    return { erro: "OS não encontrada" };

  }

  if (osCompleta.status !== "Finalizada") {

    return { erro: "A OS precisa estar finalizada para gerar nota fiscal" };

  }



  const clienteRes = await pool.query(

    `SELECT * FROM clientes WHERE id = $1 AND tenant_id = $2`,

    [osCompleta.cliente_id, tenantId],

  );

  const cliente = clienteRes.rows[0];

  if (!cliente) {

    return { erro: "Cliente da OS não encontrado" };

  }



  const existenteCheck = await pool.query(

    `SELECT id, status FROM notas_fiscais WHERE ordem_servico_id = $1 AND tenant_id = $2`,

    [osId, tenantId],

  );

  if (existenteCheck.rows[0]?.status === "autorizada") {

    return { erro: "Esta OS já possui nota fiscal autorizada" };

  }



  let status = "configuracao_pendente";

  let mensagem =

    "Defina NUVEM_FISCAL_CLIENT_ID, NUVEM_FISCAL_CLIENT_SECRET e NUVEM_FISCAL_CNPJ_EMITENTE no servidor.";

  let dadosResposta = {};

  let dadosEnvio = {

    ordem_servico_id: osCompleta.id,

    os_numero: osCompleta.numero,

    modelo: "NFSE",

  };

  let idProvedor = null;

  let numeroNf = null;

  let linkPdf = null;

  let dataEmissao = null;

  let chaveAcesso = null;



  const tributos = tributosPadraoDaOs(osCompleta.valor_total);



  if (isNuvemFiscalConfigured()) {

    const montagem = montarCorpoEmissaoNfseDps(

      osCompleta,

      cliente,

      osCompleta.produtos,

      osCompleta.servicos,

    );

    if (!montagem.ok) {

      status = "configuracao_pendente";

      mensagem = montagem.erro;

      dadosResposta = { validacao_local: montagem.erro };

    } else {

      dadosEnvio = {

        ...dadosEnvio,

        referencia: montagem.body.referencia,

        ambiente: montagem.body.ambiente,

        provedor: montagem.body.provedor,

      };

      try {

        const api = await emitirNfseDps(montagem.body);

        if (!api.ok) {

          if (api.authError) {

            status = "erro_autenticacao";

            mensagem = api.mensagem || "Falha ao autenticar na Nuvem Fiscal";

          } else {

            status = "rejeitada";

            mensagem = api.mensagem || "Falha na emissão na Nuvem Fiscal";

          }

          dadosResposta = {

            http_status: api.statusCode,

            detalhe: api.detalhe,

            auth_error: Boolean(api.authError),

          };

        } else {

          const data = api.data;

          dadosResposta = data;

          status = mapStatusApiNuvemParaInterno(data?.status);

          idProvedor = data?.id || null;

          numeroNf = data?.numero || null;

          linkPdf = data?.link_url || null;

          dataEmissao = data?.data_emissao

            ? new Date(data.data_emissao)

            : null;

          chaveAcesso = data?.DPS?.chave || data?.chave || null;

          const msgApi = resumoMensagensApi(data);

          mensagem =

            msgApi ||

            (status === "autorizada"

              ? "NFS-e autorizada na Nuvem Fiscal."

              : status === "processamento"

                ? "NFS-e em processamento na Nuvem Fiscal. Consulte o painel ou reprocessar mais tarde."

                : "Resposta recebida da Nuvem Fiscal.");

        }

      } catch (e) {

        status = "rejeitada";

        mensagem = e.message || "Erro inesperado ao chamar Nuvem Fiscal";

        dadosResposta = { exception: mensagem };

      }

    }

  }



  const client = await pool.connect();

  try {

    await client.query("BEGIN");



    const insert = await client.query(

      `INSERT INTO notas_fiscais (

        tenant_id, ordem_servico_id, modelo_documento, provedor, status,

        id_provedor, numero, chave_acesso, valor_total, tributos,

        dados_envio, dados_resposta, link_pdf, mensagem_status, data_emissao, atualizado_em

      ) VALUES ($1, $2, 'NFSE', 'nuvem_fiscal', $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13, NOW())

      ON CONFLICT (tenant_id, ordem_servico_id) DO UPDATE SET

        status = EXCLUDED.status,

        id_provedor = EXCLUDED.id_provedor,

        numero = EXCLUDED.numero,

        chave_acesso = EXCLUDED.chave_acesso,

        valor_total = EXCLUDED.valor_total,

        tributos = EXCLUDED.tributos,

        dados_envio = EXCLUDED.dados_envio,

        dados_resposta = EXCLUDED.dados_resposta,

        link_pdf = EXCLUDED.link_pdf,

        mensagem_status = EXCLUDED.mensagem_status,

        data_emissao = COALESCE(EXCLUDED.data_emissao, notas_fiscais.data_emissao),

        atualizado_em = NOW()

      RETURNING *`,

      [

        tenantId,

        osId,

        status,

        idProvedor,

        numeroNf,

        chaveAcesso,

        osCompleta.valor_total,

        JSON.stringify(tributos),

        JSON.stringify(dadosEnvio),

        JSON.stringify(dadosResposta),

        linkPdf,

        mensagem,

        dataEmissao,

      ],

    );



    const nf = insert.rows[0];

    await client.query(

      `UPDATE ordens_servico SET nf_id = $1, atualizado_em = CURRENT_TIMESTAMP

       WHERE id = $2 AND tenant_id = $3`,

      [nf.id, osId, tenantId],

    );



    await client.query("COMMIT");



    const apiNf = mapNfParaRespostaApi(nf);

    return {

      nf: apiNf,

      message:

        status === "configuracao_pendente"

          ? mensagem ||

            "Registro fiscal criado. Configure a Nuvem Fiscal no servidor para enviar à prefeitura."

          : status === "erro_autenticacao"

            ? "Registro criado, mas a autenticação na Nuvem Fiscal falhou. Verifique as credenciais."

            : mensagem,

    };

  } catch (e) {

    await client.query("ROLLBACK");

    throw e;

  } finally {

    client.release();

  }

};



export default {

  listar,

  buscarPorId,

  buscarPorOsId,

  gerarParaOs,

  mapNfParaRespostaApi,

};

