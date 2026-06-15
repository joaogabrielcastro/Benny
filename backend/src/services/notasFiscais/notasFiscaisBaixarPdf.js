import {
  baixarPdfNfe,
  baixarPdfNfse,
  consultarNfe,
  consultarNfse,
} from "../nuvemFiscalClient.js";
import { resolverStatusNuvem } from "./nuvemRespostaParser.js";
import { buscarPorId } from "./notasFiscaisRepository.js";

export const baixarPdf = async (tenantId, nfId) => {
  const nf = await buscarPorId(tenantId, nfId);
  if (!nf) return { erro: "Nota fiscal não encontrada" };
  if (!nf.id_provedor) {
    return { erro: "Nota sem vínculo na Nuvem Fiscal. Sincronize o status antes." };
  }

  const consulta =
    nf.modelo_documento === "NFE"
      ? await consultarNfe(nf.id_provedor)
      : await consultarNfse(nf.id_provedor);

  if (consulta.ok) {
    const { interno, bruto } = resolverStatusNuvem(consulta.data);
    if (interno === "rejeitada") {
      return {
        erro: `Nota rejeitada na Nuvem Fiscal (${bruto || "sem detalhe"}). PDF não disponível — corrija e reemita.`,
      };
    }
    if (interno !== "autorizada") {
      return {
        erro: `Nota ainda não autorizada na Nuvem (${bruto || interno}). Aguarde ou use Atualizar status.`,
      };
    }
  }

  const fn = nf.modelo_documento === "NFE" ? baixarPdfNfe : baixarPdfNfse;
  const api = await fn(nf.id_provedor);
  if (!api.ok) {
    const extra =
      api.statusCode === 404
        ? " Nota não encontrada ou PDF indisponível (rejeitada/cancelada?)."
        : "";
    return {
      erro: (api.mensagem || "Falha ao baixar PDF na Nuvem Fiscal.") + extra,
    };
  }

  const label = nf.modelo_documento === "NFE" ? "NFE" : "NFSE";
  const filename = `${label}_${nf.numero || nf.id}`.replace(/\s+/g, "_");

  return {
    buffer: api.buffer,
    contentType: api.contentType,
    filename,
  };
};
