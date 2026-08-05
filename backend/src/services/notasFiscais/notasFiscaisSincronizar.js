import {
  isNuvemFiscalConfigured,
  isNfeEmissaoHabilitada,
  mensagemNfeDesabilitada,
} from "../../config/nuvemFiscal.js";
import {
  consultarNfe,
  consultarNfse,
} from "../nuvemFiscalClient.js";
import { camposFromRespostaNuvem } from "./nuvemRespostaParser.js";
import { mapNfParaRespostaApi } from "./notasFiscaisMapper.js";
import {
  buscarPorOsId,
  marcarNotaRejeitadaAmbiente,
  persistirAtualizacaoNf,
} from "./notasFiscaisRepository.js";
import { SINGLE_TENANT_ID } from "../../config/singleTenant.js";
import {
  isNuvemNotaNaoEncontrada,
  mensagemNotaNaoEncontradaAmbiente,
  mensagemNuvemFilaProcessamento,
} from "./nuvemNotaNaoEncontrada.js";

async function tratarNotaOrfaAmbiente(nf, tenantId, osId, modelo, consulta) {
  if (!isNuvemNotaNaoEncontrada(consulta)) return null;
  const msg = mensagemNotaNaoEncontradaAmbiente();
  const atualizada = await marcarNotaRejeitadaAmbiente(
    nf.id,
    tenantId,
    osId,
    modelo,
    msg,
  );
  return {
    nf: mapNfParaRespostaApi(atualizada || nf),
    message: msg,
  };
}

export const sincronizarPorOs = async (
  tenantId = SINGLE_TENANT_ID,
  osId,
  modeloDocumento = "NFSE",
) => {
  const modelo = modeloDocumento === "NFE" ? "NFE" : "NFSE";
  if (modelo === "NFE" && !isNfeEmissaoHabilitada()) {
    return { erro: mensagemNfeDesabilitada() };
  }
  const nf = await buscarPorOsId(tenantId, osId, modelo);
  if (!nf) {
    return {
      erro: `Nenhuma ${modelo === "NFE" ? "NF-e" : "NFS-e"} registrada para esta OS`,
    };
  }
  const valorOs = Number(nf.valor_total) || 0;
  const consultarFn = modelo === "NFE" ? consultarNfe : consultarNfse;
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";

  if (nf.status === "autorizada" && nf.id_provedor && isNuvemFiscalConfigured()) {
    const consulta = await consultarFn(nf.id_provedor);
    if (consulta.ok) {
      const campos = camposFromRespostaNuvem(consulta.data, valorOs, modelo);
      const atualizada = await persistirAtualizacaoNf(
        nf.id,
        tenantId,
        osId,
        { ...campos, idProvedor: campos.idProvedor || nf.id_provedor },
        modelo,
      );
      return {
        nf: mapNfParaRespostaApi(atualizada),
        message: `${label}: tributos atualizados na Notaas.`,
      };
    }
    const orfa = await tratarNotaOrfaAmbiente(
      nf,
      tenantId,
      osId,
      modelo,
      consulta,
    );
    if (orfa) return orfa;
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
      message: nf.mensagem_status || "Notaas não configurada no servidor (NOTAAS_API_KEY).",
    };
  }
  if (!nf.id_provedor) {
    return {
      erro: `Esta ${label} ainda não tem ID na Notaas. Use o botão Gerar.`,
    };
  }

  let consulta = await consultarFn(nf.id_provedor);
  if (!consulta.ok) {
    const orfa = await tratarNotaOrfaAmbiente(
      nf,
      tenantId,
      osId,
      modelo,
      consulta,
    );
    if (orfa) return orfa;
    return {
      erro: consulta.mensagem || `Falha ao consultar ${label} na Notaas`,
    };
  }

  let campos = camposFromRespostaNuvem(consulta.data, valorOs, modelo);

  if (campos.status === "processamento") {
    campos.mensagem = mensagemNuvemFilaProcessamento();
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
