import pool from "../../../database.js";
import { SINGLE_TENANT_ID } from "../../config/singleTenant.js";
import {
  getNuvemFiscalConfig,
  isNuvemFiscalConfigured,
  isNfeEmissaoHabilitada,
  isNfseIncluirPecas,
  mensagemNfeDesabilitada,
} from "../../config/nuvemFiscal.js";
import { emitirNfe, emitirNfseDps } from "../nuvemFiscalClient.js";
import {
  gerarReferenciaFiscal,
  montarCorpoEmissaoNfseDps,
} from "../nuvemFiscalNfsePayload.js";
import {
  montarCorpoEmissaoNfe,
  obterProximoNumeroNfe,
} from "../nuvemFiscalNfePayload.js";
import { totaisFiscaisOs, valorEmissaoNfse } from "../osValoresFiscais.js";
import ordensServicoService from "../ordensServicoService.js";
import { tributosEstimadosDaOs } from "../tributosNfse.js";
import { camposFromRespostaNuvem } from "./nuvemRespostaParser.js";
import { mapNfParaRespostaApi } from "./notasFiscaisMapper.js";
import {
  buscarPorOsId,
  clienteDaOs,
  colunaVinculoOs,
} from "./notasFiscaisRepository.js";
import { sincronizarPorOs } from "./notasFiscaisSincronizar.js";
import { resolveCodigoIbgeCliente } from "../../domain/clienteIbge.js";

export const gerarParaOs = async (
  tenantId = SINGLE_TENANT_ID,
  osId,
  { forcarNovaEmissao = false, modeloDocumento = "NFSE" } = {},
) => {
  const modelo = modeloDocumento === "NFE" ? "NFE" : "NFSE";
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";

  if (modelo === "NFE" && !isNfeEmissaoHabilitada()) {
    return { erro: mensagemNfeDesabilitada() };
  }

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

  if (!cliente.codigo_ibge && cliente.cep) {
    const ibge = await resolveCodigoIbgeCliente(
      cliente.cep,
      clienteRes.rows[0].codigo_ibge,
    );
    if (ibge) {
      cliente.codigo_ibge = ibge;
      await pool.query(
        `UPDATE clientes SET codigo_ibge = $1, atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3`,
        [ibge, osCompleta.cliente_id, tenantId],
      );
    }
  }

  const totais = totaisFiscaisOs(osCompleta);
  const valorNota =
    modelo === "NFE"
      ? totais.valor_produtos
      : valorEmissaoNfse(totais, isNfseIncluirPecas());

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

    let nNF;
    if (modelo === "NFE") {
      const { nfeSerie } = getNuvemFiscalConfig();
      nNF = await obterProximoNumeroNfe(tenantId, nfeSerie);
    }

    const montagem =
      modelo === "NFE"
        ? montarCorpoEmissaoNfe(osCompleta, cliente, osCompleta.produtos, {
            referencia,
            nfRegistroId: nfRegistroExistente,
            nNF,
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
          const parsed = camposFromRespostaNuvem(api.data, valorNota, modelo);
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
