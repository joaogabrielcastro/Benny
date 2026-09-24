import {
  isNfeEmissaoHabilitada,
  mensagemNfeDesabilitada,
} from "../../config/nuvemFiscal.js";
import { resolveFiscalProvider } from "../fiscal/providers/index.js";
import {
  FISCAL_PROVIDERS,
  normalizarModeloDocumento,
} from "../fiscal/constants.js";
import {
  eventoFiscalPorStatus,
  registrarEventoFiscal,
} from "../fiscal/fiscalAuditoria.js";
import { camposFromRespostaNuvem } from "./nuvemRespostaParser.js";
import { mapNfParaRespostaApi } from "./notasFiscaisMapper.js";
import {
  buscarPorId,
  persistirAtualizacaoNf,
} from "./notasFiscaisRepository.js";
import { SINGLE_TENANT_ID } from "../../config/singleTenant.js";

const MOTIVO_PADRAO =
  "Cancelamento solicitado pelo emitente conforme solicitacao interna.";

export const cancelar = async (
  tenantId = SINGLE_TENANT_ID,
  nfId,
  { motivo, codigo, usuarioId = null } = {},
) => {
  const nf = await buscarPorId(tenantId, nfId);
  if (!nf) return { erro: "Nota fiscal não encontrada" };

  if (nf.status === "cancelada") {
    return {
      nf: mapNfParaRespostaApi(nf),
      message: "Nota fiscal já está cancelada.",
    };
  }

  if (nf.status !== "autorizada") {
    return {
      erro: "Somente notas autorizadas podem ser canceladas. Atualize o status antes.",
    };
  }

  const modelo = normalizarModeloDocumento(nf.modelo_documento);
  const provider = await resolveFiscalProvider({
    modeloDocumento: modelo,
    provedor: nf.provedor,
    tenantId,
  });
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";

  if (!nf.id_provedor) {
    return {
      erro: `Nota sem vínculo na ${provider.rotulo}. Não é possível cancelar.`,
    };
  }

  if (!provider.isConfigured()) {
    return { erro: provider.mensagemNaoConfigurado() };
  }

  if (modelo === "NFE" && !isNfeEmissaoHabilitada()) {
    return { erro: mensagemNfeDesabilitada() };
  }

  const valorOs = Number(nf.valor_total) || 0;
  const dados =
    nf.dados_resposta && typeof nf.dados_resposta === "object"
      ? nf.dados_resposta
      : {};
  const body =
    provider.id === FISCAL_PROVIDERS.BRASIL_NFE
      ? {
          justificativa: (motivo || MOTIVO_PADRAO).trim().slice(0, 255),
          numeroProtocolo:
            nf.protocolo ||
            dados.numeroProtocolo ||
            dados.ReturnNF?.NumeroProtocolo ||
            "",
          chave: nf.chave_acesso || nf.id_provedor,
        }
      : {
          motivo: (motivo || MOTIVO_PADRAO).trim().slice(0, 255),
          ...(codigo ? { codigo: String(codigo).trim() } : {}),
        };

  const idCancelamento =
    provider.id === FISCAL_PROVIDERS.BRASIL_NFE
      ? nf.chave_acesso || nf.id_provedor
      : nf.id_provedor;

  const api = await provider.cancelar(idCancelamento, body);
  if (!api.ok) {
    return {
      erro: api.mensagem || `Falha ao cancelar ${label}.`,
    };
  }

  const consulta =
    provider.id === FISCAL_PROVIDERS.BRASIL_NFE
      ? { ok: true, data: api.data, confirmadoExternamente: true }
      : await provider.consultar(nf.id_provedor);

  let campos;
  if (consulta.ok) {
    campos = camposFromRespostaNuvem(
      consulta.data,
      valorOs,
      modelo,
      provider.rotulo,
    );
    if (campos.status !== "cancelada") {
      campos.status = "cancelada";
      campos.mensagem = `${label} cancelada.`;
    }
  } else {
    campos = {
      status: "cancelada",
      idProvedor: nf.id_provedor,
      numeroNf: nf.numero,
      linkPdf: nf.link_pdf,
      chaveAcesso: nf.chave_acesso,
      serie: nf.serie,
      protocolo: nf.protocolo,
      dataEmissao: nf.data_emissao,
      mensagem: `${label} cancelada.`,
      dadosResposta: api.data || {},
      tributos: nf.tributos,
    };
  }

  const atualizada = await persistirAtualizacaoNf(
    nf.id,
    tenantId,
    nf.ordem_servico_id,
    { ...campos, idProvedor: nf.id_provedor },
    modelo,
  );

  await registrarEventoFiscal({
    tenantId,
    usuarioId,
    ordemServicoId: nf.ordem_servico_id,
    notaFiscalId: nf.id,
    modelo,
    provedor: provider.id,
    evento: eventoFiscalPorStatus(modelo, "cancelada"),
    status: "cancelada",
  });

  return {
    nf: mapNfParaRespostaApi(atualizada),
    message: campos.mensagem || `${label} cancelada com sucesso.`,
  };
};
