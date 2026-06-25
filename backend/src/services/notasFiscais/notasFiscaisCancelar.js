import {
  isNuvemFiscalConfigured,
  isNfeEmissaoHabilitada,
  mensagemNfeDesabilitada,
} from "../../config/nuvemFiscal.js";
import {
  cancelarNfe,
  cancelarNfse,
  consultarNfe,
  consultarNfse,
} from "../nuvemFiscalClient.js";
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
  { motivo, codigo } = {},
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

  if (!nf.id_provedor) {
    return {
      erro: "Nota sem vínculo na Nuvem Fiscal. Não é possível cancelar.",
    };
  }

  if (!isNuvemFiscalConfigured()) {
    return { erro: "Nuvem Fiscal não configurada no servidor." };
  }

  const modelo = nf.modelo_documento === "NFE" ? "NFE" : "NFSE";
  if (modelo === "NFE" && !isNfeEmissaoHabilitada()) {
    return { erro: mensagemNfeDesabilitada() };
  }
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";
  const valorOs = Number(nf.valor_total) || 0;

  const body =
    modelo === "NFE"
      ? { justificativa: (motivo || MOTIVO_PADRAO).trim().slice(0, 255) }
      : {
          motivo: (motivo || MOTIVO_PADRAO).trim().slice(0, 255),
          ...(codigo ? { codigo: String(codigo).trim() } : {}),
        };

  const cancelarFn = modelo === "NFE" ? cancelarNfe : cancelarNfse;
  const consultarFn = modelo === "NFE" ? consultarNfe : consultarNfse;

  const api = await cancelarFn(nf.id_provedor, body);
  if (!api.ok) {
    return {
      erro: api.mensagem || `Falha ao cancelar ${label} na Nuvem Fiscal`,
    };
  }

  const consulta = await consultarFn(nf.id_provedor);
  let campos;
  if (consulta.ok) {
    campos = camposFromRespostaNuvem(consulta.data, valorOs, modelo);
    if (campos.status !== "cancelada") {
      campos.status = "cancelada";
      campos.mensagem = `${label} cancelada na Nuvem Fiscal.`;
    }
  } else {
    campos = {
      status: "cancelada",
      idProvedor: nf.id_provedor,
      numeroNf: nf.numero,
      linkPdf: nf.link_pdf,
      chaveAcesso: nf.chave_acesso,
      dataEmissao: nf.data_emissao,
      mensagem: `${label} cancelada na Nuvem Fiscal.`,
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

  return {
    nf: mapNfParaRespostaApi(atualizada),
    message: campos.mensagem || `${label} cancelada com sucesso.`,
  };
};
