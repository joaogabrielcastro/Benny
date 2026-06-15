import { baixarPdfNfe, baixarPdfNfse } from "../nuvemFiscalClient.js";
import { buscarPorId } from "./notasFiscaisRepository.js";

export const baixarPdf = async (tenantId, nfId) => {
  const nf = await buscarPorId(tenantId, nfId);
  if (!nf) return { erro: "Nota fiscal não encontrada" };
  if (!nf.id_provedor) {
    return { erro: "Nota sem vínculo na Nuvem Fiscal. Sincronize o status antes." };
  }
  if (nf.status !== "autorizada") {
    return { erro: "PDF disponível apenas para notas autorizadas." };
  }

  const fn = nf.modelo_documento === "NFE" ? baixarPdfNfe : baixarPdfNfse;
  const api = await fn(nf.id_provedor);
  if (!api.ok) {
    return { erro: api.mensagem || "Falha ao baixar PDF na Nuvem Fiscal" };
  }

  const label = nf.modelo_documento === "NFE" ? "NFE" : "NFSE";
  const filename = `${label}_${nf.numero || nf.id}`.replace(/\s+/g, "_");

  return {
    buffer: api.buffer,
    contentType: api.contentType,
    filename,
  };
};
