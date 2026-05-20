import pool from "../../database.js";

import { SINGLE_TENANT_ID } from "../config/singleTenant.js";

import { isNuvemFiscalConfigured } from "../config/nuvemFiscal.js";

import {
  consultarNfe,
  consultarNfse,
  emitirNfe,
  emitirNfseDps,
  sincronizarNfeNaSefaz,
  sincronizarNfseNaPrefeitura,
} from "./nuvemFiscalClient.js";

import {
  gerarReferenciaFiscal,
  montarCorpoEmissaoNfseDps,
} from "./nuvemFiscalNfsePayload.js";
import { montarCorpoEmissaoNfe } from "./nuvemFiscalNfePayload.js";
import { totaisFiscaisOs } from "./osValoresFiscais.js";

import ordensServicoService from "./ordensServicoService.js";

import {
  extrairTributosDeRespostaNuvem,
  tributosEstimadosDaOs,
} from "./tributosNfse.js";



function mapStatusApiNuvemParaInterno(apiStatus) {
  if (!apiStatus) return "processamento";

  const s = String(apiStatus).toLowerCase().trim();

  if (
    s === "autorizada" ||
    s === "autorizado" ||
    s === "emitida" ||
    s === "concluida" ||
    s === "concluído" ||
    s === "concluido" ||
    s === "sucesso" ||
    s === "aprovada"
  )
    return "autorizada";

  if (s === "processando" || s === "processamento" || s === "pendente")
    return "processamento";

  if (
    s === "negada" ||
    s === "erro" ||
    s === "rejeitada" ||
    s === "denegada" ||
    s === "falha" ||
    s === "reprovada"
  )
    return "rejeitada";

  if (s === "cancelada") return "cancelada";

  if (s === "substituida" || s === "substituída") return "substituida";

  return "processamento";
}

/** Lê status em vários campos possíveis do JSON da Nuvem Fiscal. */
function extrairStatusBrutoNuvem(data) {
  if (!data || typeof data !== "object") return null;
  const candidatos = [
    data.status,
    data.situacao,
    data.status_nfse,
    data.situacao_nfse,
    data.status_sefaz,
    data.autorizacao?.status,
    data.DPS?.status,
    data.nfse?.status,
  ];
  for (const c of candidatos) {
    if (c != null && String(c).trim() !== "") return String(c).trim();
  }
  return null;
}

function nfPareceAutorizada(data) {
  if (!data || typeof data !== "object") return false;
  const num = data.numero ?? data.nNFSe ?? data.nfse?.numero;
  const chave =
    data.chave ?? data.chave_acesso ?? data.DPS?.chave ?? data.nfse?.chave;
  const link = data.link_url ?? data.url ?? data.link_pdf;
  return Boolean(num && (chave || link));
}

function resolverStatusNuvem(data) {
  const bruto = extrairStatusBrutoNuvem(data);
  let interno = mapStatusApiNuvemParaInterno(bruto);

  if (interno === "processamento" && nfPareceAutorizada(data)) {
    interno = "autorizada";
  }

  const msgs = data?.mensagens;
  if (
    interno === "processamento" &&
    Array.isArray(msgs) &&
    msgs.some((m) => {
      const t = String(m?.tipo || m?.type || "").toLowerCase();
      return t.includes("erro") || t.includes("rejei");
    })
  ) {
    interno = "rejeitada";
  }

  return { interno, bruto };
}

function mensagemPadraoPorStatus(status, msgApi) {
  if (msgApi) return msgApi;
  if (status === "autorizada") return "NFS-e autorizada na Nuvem Fiscal.";
  if (status === "rejeitada")
    return "NFS-e rejeitada na Nuvem Fiscal. Veja as observações.";
  if (status === "processamento")
    return "NFS-e ainda em processamento na Nuvem Fiscal. Aguarde alguns minutos e use Atualizar status.";
  return "Status atualizado na Nuvem Fiscal.";
}

function camposFromRespostaNuvem(data, valorTotalOs = 0) {
  const { interno: status, bruto: statusBruto } = resolverStatusNuvem(data);
  const msgApi = resumoMensagensApi(data);
  const hora = new Date().toLocaleString("pt-BR");
  let mensagem = mensagemPadraoPorStatus(status, msgApi);
  if (statusBruto) {
    mensagem += ` (Nuvem: ${statusBruto} — consulta ${hora})`;
  } else if (status === "processamento") {
    mensagem += ` (consulta ${hora}: sem status final na Nuvem ainda)`;
  }
  const tributos = extrairTributosDeRespostaNuvem(data, valorTotalOs);
  return {
    status,
    statusBruto,
    idProvedor: data?.id || null,
    numeroNf:
      data?.numero ?? data?.nNFSe ?? data?.nfse?.numero ?? null,
    linkPdf:
      data?.link_url ??
      data?.url ??
      data?.link_pdf ??
      data?.link_danfe ??
      null,
    dataEmissao: data?.data_emissao ? new Date(data.data_emissao) : null,
    chaveAcesso:
      data?.DPS?.chave ?? data?.chave ?? data?.chave_acesso ?? data?.nfse?.chave ?? null,
    mensagem,
    dadosResposta: data,
    tributos,
  };
}

function colunaVinculoOs(modeloDocumento) {
  return modeloDocumento === "NFE" ? "nf_nfe_id" : "nf_id";
}

function clienteDaOs(osRow, clienteDb) {
  if (clienteDb) return clienteDb;
  return {
    nome: osRow.cliente_nome,
    telefone: osRow.cliente_telefone,
    cpf_cnpj: osRow.cliente_cpf_cnpj,
    email: osRow.cliente_email,
    endereco: osRow.cliente_endereco,
    numero: osRow.cliente_numero,
    complemento: osRow.cliente_complemento,
    bairro: osRow.cliente_bairro,
    cidade: osRow.cliente_cidade,
    estado: osRow.cliente_estado,
    cep: osRow.cliente_cep,
  };
}

async function persistirAtualizacaoNf(
  nfId,
  tenantId,
  osId,
  campos,
  modeloDocumento = "NFSE",
) {
  const r = await pool.query(
    `UPDATE notas_fiscais SET
       status = COALESCE($1, status),
       id_provedor = COALESCE($2, id_provedor),
       numero = COALESCE($3, numero),
       chave_acesso = COALESCE($4, chave_acesso),
       link_pdf = COALESCE($5, link_pdf),
       mensagem_status = $6,
       dados_resposta = COALESCE($7::jsonb, dados_resposta),
       data_emissao = COALESCE($8, data_emissao),
       tributos = COALESCE($9::jsonb, tributos),
       atualizado_em = NOW()
     WHERE id = $10 AND tenant_id = $11
     RETURNING *`,
    [
      campos.status,
      campos.idProvedor,
      campos.numeroNf,
      campos.chaveAcesso,
      campos.linkPdf,
      campos.mensagem,
      campos.dadosResposta ? JSON.stringify(campos.dadosResposta) : null,
      campos.dataEmissao,
      campos.tributos ? JSON.stringify(campos.tributos) : null,
      nfId,
      tenantId,
    ],
  );
  if (r.rows[0]) {
    const col = colunaVinculoOs(modeloDocumento);
    await pool.query(
      `UPDATE ordens_servico SET ${col} = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3`,
      [nfId, osId, tenantId],
    );
  }
  return r.rows[0] || null;
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



const listar = async (
  tenantId = SINGLE_TENANT_ID,
  { limit = 20, offset = 0 } = {},
) => {
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM notas_fiscais WHERE tenant_id = $1`,
    [tenantId],
  );
  const total = countRes.rows[0]?.total ?? 0;
  const r = await pool.query(
    `SELECT * FROM notas_fiscais WHERE tenant_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return { rows: r.rows.map(mapNfParaRespostaApi), total };
};



const buscarPorId = async (tenantId = SINGLE_TENANT_ID, id) => {

  const r = await pool.query(

    `SELECT * FROM notas_fiscais WHERE id = $1 AND tenant_id = $2`,

    [id, tenantId],

  );

  return r.rows[0] || null;

};



const buscarPorOsId = async (
  tenantId = SINGLE_TENANT_ID,
  osId,
  modeloDocumento = "NFSE",
) => {
  const r = await pool.query(
    `SELECT * FROM notas_fiscais
     WHERE ordem_servico_id = $1 AND tenant_id = $2 AND modelo_documento = $3`,
    [osId, tenantId, modeloDocumento],
  );
  return r.rows[0] || null;
};

const listarPorOsId = async (tenantId = SINGLE_TENANT_ID, osId) => {
  const r = await pool.query(
    `SELECT * FROM notas_fiscais
     WHERE ordem_servico_id = $1 AND tenant_id = $2
     ORDER BY modelo_documento`,
    [osId, tenantId],
  );
  return r.rows;
};



/** Consulta (e, se necessário, sincroniza) nota já enviada — sem nova emissão. */
const sincronizarPorOs = async (
  tenantId = SINGLE_TENANT_ID,
  osId,
  modeloDocumento = "NFSE",
) => {
  const modelo = modeloDocumento === "NFE" ? "NFE" : "NFSE";
  const nf = await buscarPorOsId(tenantId, osId, modelo);
  if (!nf) {
    return {
      erro: `Nenhuma ${modelo === "NFE" ? "NF-e" : "NFS-e"} registrada para esta OS`,
    };
  }
  const valorOs = Number(nf.valor_total) || 0;
  const consultarFn = modelo === "NFE" ? consultarNfe : consultarNfse;
  const sincronizarFn =
    modelo === "NFE" ? sincronizarNfeNaSefaz : sincronizarNfseNaPrefeitura;
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";

  if (nf.status === "autorizada" && nf.id_provedor && isNuvemFiscalConfigured()) {
    const consulta = await consultarFn(nf.id_provedor);
    if (consulta.ok) {
      const campos = camposFromRespostaNuvem(consulta.data, valorOs);
      const atualizada = await persistirAtualizacaoNf(
        nf.id,
        tenantId,
        osId,
        { ...campos, idProvedor: campos.idProvedor || nf.id_provedor },
        modelo,
      );
      return {
        nf: mapNfParaRespostaApi(atualizada),
        message: `${label}: tributos atualizados na Nuvem Fiscal.`,
      };
    }
  }

  if (nf.status === "autorizada") {
    return {
      nf: mapNfParaRespostaApi(nf),
      message: `${label} já está autorizada.`,
    };
  }
  if (!isNuvemFiscalConfigured()) {
    return {
      nf: mapNfParaRespostaApi(nf),
      message: nf.mensagem_status || "Nuvem Fiscal não configurada no servidor.",
    };
  }
  if (!nf.id_provedor) {
    return {
      erro: `Esta ${label} ainda não tem ID na Nuvem Fiscal. Use o botão Gerar.`,
    };
  }

  let consulta = await consultarFn(nf.id_provedor);
  if (!consulta.ok) {
    return {
      erro: consulta.mensagem || `Falha ao consultar ${label} na Nuvem Fiscal`,
    };
  }

  let campos = camposFromRespostaNuvem(consulta.data, valorOs);

  if (campos.status === "processamento") {
    const sync = await sincronizarFn(nf.id_provedor);
    if (sync.ok && sync.data) {
      consulta = { ok: true, data: sync.data };
    } else if (sync.ok) {
      consulta = await consultarFn(nf.id_provedor);
    }
    if (consulta.ok) campos = camposFromRespostaNuvem(consulta.data, valorOs);
    else if (!sync.ok && sync.mensagem) {
      return { erro: sync.mensagem };
    }
  }

  const atualizada = await persistirAtualizacaoNf(
    nf.id,
    tenantId,
    osId,
    { ...campos, idProvedor: campos.idProvedor || nf.id_provedor },
    modelo,
  );

  return {
    nf: mapNfParaRespostaApi(atualizada),
    message: campos.mensagem,
  };
};

const gerarParaOs = async (
  tenantId = SINGLE_TENANT_ID,
  osId,
  { forcarNovaEmissao = false, modeloDocumento = "NFSE" } = {},
) => {
  const modelo = modeloDocumento === "NFE" ? "NFE" : "NFSE";
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";

  const osCompleta = await ordensServicoService.buscarPorId(tenantId, osId);
  if (!osCompleta) return { erro: "OS não encontrada" };
  if (osCompleta.status !== "Finalizada") {
    return { erro: "A OS precisa estar finalizada para gerar nota fiscal" };
  }

  const clienteRes = await pool.query(
    `SELECT * FROM clientes WHERE id = $1 AND tenant_id = $2`,
    [osCompleta.cliente_id, tenantId],
  );
  const cliente = clienteDaOs(osCompleta, clienteRes.rows[0]);
  if (!clienteRes.rows[0]) return { erro: "Cliente da OS não encontrado" };

  const totais = totaisFiscaisOs(osCompleta);
  const valorNota =
    modelo === "NFE" ? totais.valor_produtos : totais.valor_servicos;

  const nfExistente = await buscarPorOsId(tenantId, osId, modelo);
  if (nfExistente?.status === "autorizada") {
    return { erro: `Esta OS já possui ${label} autorizada` };
  }
  if (
    !forcarNovaEmissao &&
    nfExistente?.status === "processamento" &&
    nfExistente?.id_provedor &&
    isNuvemFiscalConfigured()
  ) {
    return sincronizarPorOs(tenantId, osId, modelo);
  }

  const nfRegistroExistente = nfExistente?.id ?? null;

  let status = "configuracao_pendente";
  let mensagem =
    "Defina NUVEM_FISCAL_CLIENT_ID, NUVEM_FISCAL_CLIENT_SECRET e NUVEM_FISCAL_CNPJ_EMITENTE no servidor.";
  let dadosResposta = {};
  let dadosEnvio = {
    ordem_servico_id: osCompleta.id,
    os_numero: osCompleta.numero,
    modelo,
    valor_nota: valorNota,
  };
  let idProvedor = null;
  let numeroNf = null;
  let linkPdf = null;
  let dataEmissao = null;
  let chaveAcesso = null;

  let tributos =
    modelo === "NFSE"
      ? tributosEstimadosDaOs(valorNota)
      : { valor_base: valorNota, valor_icms: 0, valor_liquido: valorNota };

  if (isNuvemFiscalConfigured()) {
    const referencia = gerarReferenciaFiscal(
      osId,
      modelo,
      nfRegistroExistente,
    );
    const montagem =
      modelo === "NFE"
        ? montarCorpoEmissaoNfe(osCompleta, cliente, osCompleta.produtos, {
            referencia,
            nfRegistroId: nfRegistroExistente,
          })
        : montarCorpoEmissaoNfseDps(
            osCompleta,
            cliente,
            osCompleta.produtos,
            osCompleta.servicos,
            { referencia, nfRegistroId: nfRegistroExistente },
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
        ...(montagem.body.provedor
          ? { provedor: montagem.body.provedor }
          : {}),
      };

      try {
        const api =
          modelo === "NFE"
            ? await emitirNfe(montagem.body)
            : await emitirNfseDps(montagem.body);

        if (!api.ok) {
          status = api.authError ? "erro_autenticacao" : "rejeitada";
          mensagem =
            api.mensagem ||
            `Falha na emissão de ${label} na Nuvem Fiscal`;
          dadosResposta = {
            http_status: api.statusCode,
            detalhe: api.detalhe,
            auth_error: Boolean(api.authError),
          };
        } else {
          const parsed = camposFromRespostaNuvem(api.data, valorNota);
          dadosResposta = parsed.dadosResposta;
          status = parsed.status;
          idProvedor = parsed.idProvedor;
          numeroNf = parsed.numeroNf;
          linkPdf = parsed.linkPdf;
          dataEmissao = parsed.dataEmissao;
          chaveAcesso = parsed.chaveAcesso;
          mensagem = parsed.mensagem;
          if (parsed.tributos && modelo === "NFSE") tributos = parsed.tributos;
        }
      } catch (e) {
        status = "rejeitada";
        mensagem = e.message || "Erro inesperado ao chamar Nuvem Fiscal";
        dadosResposta = { exception: mensagem };
      }
    }
  }

  const colVinculo = colunaVinculoOs(modelo);
  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");

    const insert = await dbClient.query(
      `INSERT INTO notas_fiscais (
        tenant_id, ordem_servico_id, modelo_documento, provedor, status,
        id_provedor, numero, chave_acesso, valor_total, tributos,
        dados_envio, dados_resposta, link_pdf, mensagem_status, data_emissao, atualizado_em
      ) VALUES ($1, $2, $3, 'nuvem_fiscal', $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, NOW())
      ON CONFLICT (tenant_id, ordem_servico_id, modelo_documento) DO UPDATE SET
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
        modelo,
        status,
        idProvedor,
        numeroNf,
        chaveAcesso,
        valorNota,
        JSON.stringify(tributos),
        JSON.stringify(dadosEnvio),
        JSON.stringify(dadosResposta),
        linkPdf,
        mensagem,
        dataEmissao,
      ],
    );

    const nf = insert.rows[0];
    await dbClient.query(
      `UPDATE ordens_servico SET ${colVinculo} = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3`,
      [nf.id, osId, tenantId],
    );

    await dbClient.query("COMMIT");

    return {
      nf: mapNfParaRespostaApi(nf),
      message:
        status === "configuracao_pendente"
          ? mensagem ||
            `Registro de ${label} criado. Configure a Nuvem Fiscal no servidor.`
          : status === "erro_autenticacao"
            ? "Registro criado, mas a autenticação na Nuvem Fiscal falhou."
            : mensagem,
    };
  } catch (e) {
    await dbClient.query("ROLLBACK");
    throw e;
  } finally {
    dbClient.release();
  }
};



export default {
  listar,
  buscarPorId,
  buscarPorOsId,
  listarPorOsId,
  gerarParaOs,
  sincronizarPorOs,
  mapNfParaRespostaApi,
};

