import { isNuvemFiscalConfigured } from "../../config/nuvemFiscal.js";
import {
  consultarNfe,
  consultarNfse,
  sincronizarNfeNaSefaz,
  sincronizarNfseNaPrefeitura,
} from "../nuvemFiscalClient.js";
import { camposFromRespostaNuvem } from "./nuvemRespostaParser.js";
import { mapNfParaRespostaApi } from "./notasFiscaisMapper.js";
import {
  buscarPorOsId,
  persistirAtualizacaoNf,
} from "./notasFiscaisRepository.js";
import { SINGLE_TENANT_ID } from "../../config/singleTenant.js";

export const sincronizarPorOs = async (
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
