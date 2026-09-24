import pool from "../../../database.js";
import { SINGLE_TENANT_ID } from "../../config/singleTenant.js";
import {
  getNuvemFiscalConfig,
  isNfeEmissaoHabilitada,
  isNfseIncluirPecas,
  mensagemNfeDesabilitada,
} from "../../config/nuvemFiscal.js";
import { montarCorpoEmissaoNfseDps } from "../nuvemFiscalNfsePayload.js";
import { montarCorpoEmissaoNfe } from "../nuvemFiscalNfePayload.js";
import { avaliarNcmItensNfe } from "../../domain/ncm.js";
import { validarDestinatarioNfe } from "../../domain/destinatarioNfe.js";
import { validarConfigFiscalTenant } from "../fiscal/configFiscalService.js";
import { resolverCfopOperacao } from "../../domain/configuracaoFiscalTenant.js";
import { validarConsumidorFinalOperacao } from "../../domain/operacaoFiscalNfe.js";
import {
  numeroJaReservado,
  reservarProximoNumeroNfe,
} from "../fiscal/numeracaoNfe.js";
import { resolveFiscalProvider } from "../fiscal/providers/index.js";
import {
  emissaoJaAutorizada,
  referenciaFiscalEstavel,
} from "../fiscal/referenciaFiscal.js";
import {
  CLASSE_FALHA,
  classeDaNota,
  classificarResultadoFiscal,
} from "../fiscal/classificarFalhaFiscal.js";
import {
  eventoFiscalPorStatus,
  registrarEventoFiscal,
} from "../fiscal/fiscalAuditoria.js";
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

function nfseAutorizadaIncompleta(nfExistente, valorEsperado) {
  if (!nfExistente || nfExistente.status !== "autorizada") return false;
  if (!isNfseIncluirPecas()) return false;
  const gravado = Number(nfExistente.valor_total) || 0;
  return gravado + 0.009 < Number(valorEsperado) || 0;
}

export const gerarParaOs = async (
  tenantId = SINGLE_TENANT_ID,
  osId,
  { forcarNovaEmissao = false, modeloDocumento = "NFSE", usuarioId = null } = {},
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

  if (modelo === "NFE") {
    const ncmInvalido = avaliarNcmItensNfe(osCompleta.produtos);
    if (ncmInvalido) {
      return {
        erro: ncmInvalido.message,
        code: ncmInvalido.code,
        produtos: ncmInvalido.produtos,
      };
    }
  }

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

  let destinatario = null;
  if (modelo === "NFE") {
    destinatario = validarDestinatarioNfe(cliente);
    if (!destinatario.ok) {
      return {
        erro: destinatario.message,
        code: destinatario.code,
        campos: destinatario.campos,
      };
    }
  }

  let configFiscal = null;
  if (modelo === "NFE") {
    const fiscal = await validarConfigFiscalTenant(tenantId);
    if (!fiscal.ok) {
      return {
        erro: fiscal.message,
        code: fiscal.code,
        campos: fiscal.campos,
      };
    }
    const cfop = resolverCfopOperacao(fiscal.config, cliente.estado);
    if (!cfop.ok) {
      return { erro: cfop.message, code: cfop.code, campos: cfop.campos };
    }
    configFiscal = { ...fiscal.config, cfopResolvido: cfop.cfop, destinoOperacao: cfop.destino };
    const operacao = validarConsumidorFinalOperacao({
      consumidorFinal: osCompleta.consumidor_final,
      ufEmitente: fiscal.config.ufEmitente,
      ufDestino: cliente.estado,
      indicadorIe: destinatario.destinatario.indicadorIe,
    });
    if (!operacao.ok) {
      return { erro: operacao.message, code: operacao.code, campos: operacao.campos };
    }
    configFiscal.consumidorFinal = operacao.consumidorFinal;
  }

  const totais = totaisFiscaisOs(osCompleta);
  const valorNota =
    modelo === "NFE"
      ? totais.valor_produtos
      : valorEmissaoNfse(totais, isNfseIncluirPecas());

  const nfExistente = await buscarPorOsId(tenantId, osId, modelo);
  const reemitirNfseIncompleta =
    modelo === "NFSE" &&
    forcarNovaEmissao &&
    nfseAutorizadaIncompleta(nfExistente, valorNota);

  if (emissaoJaAutorizada(nfExistente, { reemitirIncompleta: reemitirNfseIncompleta })) {
    return { erro: `Esta OS já possui ${label} autorizada` };
  }
  const providerExistente = nfExistente
    ? await resolveFiscalProvider({
        modeloDocumento: modelo,
        provedor: nfExistente.provedor,
        tenantId,
      })
    : null;
  if (
    !forcarNovaEmissao &&
    nfExistente?.status === "processamento" &&
    nfExistente?.id_provedor &&
    providerExistente?.isConfigured()
  ) {
    return sincronizarPorOs(tenantId, osId, modelo, { usuarioId });
  }

  const nfRegistroExistente = nfExistente?.id ?? null;

  const provider = await resolveFiscalProvider({ modeloDocumento: modelo, tenantId });
  let status = "configuracao_pendente";
  let mensagem = provider.mensagemNaoConfigurado();
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
  let serieNf = null;
  let protocoloNf = null;
  let referenciaExterna = nfExistente?.referencia_externa || null;
  let classeInterna = null;

  let tributos =
    modelo === "NFSE"
      ? tributosEstimadosDaOs(valorNota)
      : { valor_base: valorNota, valor_icms: 0, valor_liquido: valorNota };

  if (provider.isConfigured()) {
    const renovarReferencia =
      forcarNovaEmissao && classeDaNota(nfExistente) === CLASSE_FALHA.FISCAL_REJECTION;
    referenciaExterna = referenciaFiscalEstavel({
      tenantId,
      osId,
      modelo,
      anterior: nfExistente?.referencia_externa,
      renovar: renovarReferencia,
    });
    const referencia = referenciaExterna;

    let nNF = modelo === "NFE" ? numeroJaReservado(nfExistente) : null;
    if (modelo === "NFE" && !nNF) {
      const { nfeSerie } = getNuvemFiscalConfig();
      serieNf = String(nfeSerie);
      nNF = await reservarProximoNumeroNfe(tenantId, nfeSerie);
      numeroNf = String(nNF);
    }

    const montagem =
      modelo === "NFE"
        ? montarCorpoEmissaoNfe(osCompleta, cliente, osCompleta.produtos, {
            referencia,
            nfRegistroId: nfRegistroExistente,
            nNF,
            configFiscal,
            consumidorFinal: configFiscal.consumidorFinal,
          })
        : montarCorpoEmissaoNfseDps(
            osCompleta,
            cliente,
            osCompleta.produtos,
            osCompleta.servicos,
            { referencia, nfRegistroId: nfRegistroExistente },
          );

    if (!montagem.ok) {
      if (montagem.code) {
        return {
          erro: montagem.erro,
          code: montagem.code,
          produtos: montagem.produtos,
        };
      }
      status = "configuracao_pendente";
      mensagem = montagem.erro;
      dadosResposta = { validacao_local: montagem.erro };
    } else {
      const cfgFiscal = getNuvemFiscalConfig();
      dadosEnvio = {
        ...dadosEnvio,
        referencia:
          montagem.meta?.referencia ||
          montagem.body.referencia ||
          referencia,
        ambiente: cfgFiscal.ambiente,
        competencia: montagem.body.competencia,
        provedor: provider.id,
        ...(modelo === "NFE" && montagem.meta
          ? {
              serie: montagem.meta.serie,
              nNF_local: montagem.meta.nNF,
            }
          : {}),
      };

      try {
        const api = await provider.emitir(montagem.body);

        if (!api.ok) {
          status = api.authError ? "erro_autenticacao" : "rejeitada";
          classeInterna = classificarResultadoFiscal(api, status);
          mensagem =
            api.mensagem || `Falha ao emitir ${label}.`;
          dadosResposta = {
            http_status: api.statusCode,
            detalhe: api.detalhe,
            auth_error: Boolean(api.authError),
            classe_interna: classeInterna,
          };
        } else {
          const parsed = camposFromRespostaNuvem(
            api.data,
            valorNota,
            modelo,
            provider.rotulo,
          );
          dadosResposta = parsed.dadosResposta;
          status = parsed.status;
          idProvedor = parsed.idProvedor;
          numeroNf = parsed.numeroNf;
          linkPdf = parsed.linkPdf;
          dataEmissao = parsed.dataEmissao;
          chaveAcesso = parsed.chaveAcesso;
          serieNf = parsed.serie || serieNf || (modelo === "NFE" ? String(montagem.meta?.serie ?? "") : null);
          protocoloNf = parsed.protocolo || protocoloNf;
          numeroNf = parsed.numeroNf || numeroNf;
          classeInterna = classificarResultadoFiscal(api, parsed.status);
          if (dadosResposta && typeof dadosResposta === "object") {
            dadosResposta = { ...dadosResposta, classe_interna: classeInterna };
          }
          mensagem = parsed.mensagem;
          if (parsed.tributos && modelo === "NFSE") tributos = parsed.tributos;
        }
      } catch (e) {
        status = "rejeitada";
        classeInterna = CLASSE_FALHA.TRANSPORT_ERROR;
        mensagem = e.message || `Falha ao emitir ${label}.`;
        dadosResposta = { exception: mensagem, classe_interna: classeInterna };
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
        id_provedor, numero, chave_acesso, serie, protocolo, referencia_externa, valor_total, tributos,
        dados_envio, dados_resposta, link_pdf, mensagem_status, data_emissao, atualizado_em
      ) VALUES ($1, $2, $3, $15, $4, $5, $6, $7, $16, $17, $18, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, NOW())
      ON CONFLICT (tenant_id, ordem_servico_id, modelo_documento) DO UPDATE SET
        provedor = EXCLUDED.provedor,
        status = EXCLUDED.status,
        id_provedor = COALESCE(EXCLUDED.id_provedor, notas_fiscais.id_provedor),
        numero = COALESCE(EXCLUDED.numero, notas_fiscais.numero),
        chave_acesso = COALESCE(EXCLUDED.chave_acesso, notas_fiscais.chave_acesso),
        serie = COALESCE(EXCLUDED.serie, notas_fiscais.serie),
        protocolo = COALESCE(EXCLUDED.protocolo, notas_fiscais.protocolo),
        referencia_externa = COALESCE(EXCLUDED.referencia_externa, notas_fiscais.referencia_externa),
        valor_total = EXCLUDED.valor_total,
        tributos = EXCLUDED.tributos,
        dados_envio = EXCLUDED.dados_envio,
        dados_resposta = EXCLUDED.dados_resposta,
        link_pdf = COALESCE(EXCLUDED.link_pdf, notas_fiscais.link_pdf),
        mensagem_status = EXCLUDED.mensagem_status,
        data_emissao = COALESCE(EXCLUDED.data_emissao, notas_fiscais.data_emissao),
        atualizado_em = NOW()
      RETURNING *`,
      [
        tenantId,
        osId,
        modelo,
        status,
        idProvedor || null,
        numeroNf || null,
        chaveAcesso || null,
        valorNota,
        JSON.stringify(tributos),
        JSON.stringify(dadosEnvio),
        JSON.stringify(dadosResposta),
        linkPdf || null,
        mensagem,
        dataEmissao,
        provider.id,
        serieNf || null,
        protocoloNf || null,
        referenciaExterna || null,
      ],
    );

    const nf = insert.rows[0];
    await dbClient.query(
      `UPDATE ordens_servico SET ${colVinculo} = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2 AND tenant_id = $3`,
      [nf.id, osId, tenantId],
    );

    await dbClient.query("COMMIT");

    const evento = eventoFiscalPorStatus(modelo, status);
    await registrarEventoFiscal(
      {
        tenantId,
        usuarioId,
        ordemServicoId: osId,
        notaFiscalId: nf.id,
        modelo,
        provedor: provider.id,
        evento,
        status,
      },
      dbClient,
    );
    if (evento !== eventoFiscalPorStatus(modelo, "processamento") && status !== "configuracao_pendente") {
      await registrarEventoFiscal({
        tenantId,
        usuarioId,
        ordemServicoId: osId,
        notaFiscalId: nf.id,
        modelo,
        provedor: provider.id,
        evento: eventoFiscalPorStatus(modelo, "processamento"),
        status,
      });
    }

    return {
      nf: mapNfParaRespostaApi(nf),
      message:
        status === "configuracao_pendente"
          ? mensagem || provider.mensagemNaoConfigurado()
          : status === "erro_autenticacao"
            ? `Registro criado, mas a autenticação na ${provider.rotulo} falhou.`
            : mensagem,
    };
  } catch (e) {
    await dbClient.query("ROLLBACK");
    throw e;
  } finally {
    dbClient.release();
  }
};
