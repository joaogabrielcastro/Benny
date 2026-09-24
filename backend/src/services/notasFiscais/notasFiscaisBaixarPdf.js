import { resolveFiscalProvider } from "../fiscal/providers/index.js";
import { resolverStatusNuvem } from "./nuvemRespostaParser.js";
import { buscarPorId } from "./notasFiscaisRepository.js";

export const baixarPdf = async (tenantId, nfId) => {
  const nf = await buscarPorId(tenantId, nfId);
  if (!nf) return { erro: "Nota fiscal não encontrada" };

  const provider = await resolveFiscalProvider({
    modeloDocumento: nf.modelo_documento,
    provedor: nf.provedor,
    tenantId,
  });

  if (!nf.id_provedor) {
    return { erro: `Nota sem vínculo na ${provider.rotulo}.` };
  }
  if (nf.status !== "autorizada" && nf.status !== "cancelada") {
    return {
      erro: "Nota ainda não autorizada. Aguarde ou use Atualizar status.",
    };
  }
  if (!provider.isConfigured()) {
    return { erro: provider.mensagemNaoConfigurado() };
  }

  const consulta = await provider.consultar(nf.id_provedor);
  if (consulta.confirmadoExternamente && consulta.ok) {
    const { interno, bruto } = resolverStatusNuvem(consulta.data);
    if (interno === "rejeitada") {
      return {
        erro: `Nota rejeitada na ${provider.rotulo} (${bruto || "sem detalhe"}). PDF não disponível.`,
      };
    }
    if (interno !== "autorizada" && interno !== "cancelada") {
      return {
        erro: `Nota ainda não autorizada na ${provider.rotulo} (${bruto || interno}).`,
      };
    }
  }

  const api = await provider.baixarPdf(nf.id_provedor);
  if (!api.ok) {
    const extra =
      api.statusCode === 404
        ? " Arquivo não encontrado no provedor."
        : "";
    return {
      erro: (api.mensagem || `Falha ao baixar PDF na ${provider.rotulo}.`) + extra,
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
