import {
  isNfeEmissaoHabilitada,
  mensagemNfeDesabilitada,
} from "../../config/nuvemFiscal.js";
import { resolveFiscalProvider } from "../fiscal/providers/index.js";
import { FISCAL_PROVIDERS } from "../fiscal/constants.js";
import {
  eventoFiscalPorStatus,
  registrarEventoFiscal,
} from "../fiscal/fiscalAuditoria.js";
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
  { usuarioId = null } = {},
) => {
  try {
    return await sincronizarPorOsInterno(tenantId, osId, modeloDocumento, usuarioId);
  } catch (e) {
    const msg = e?.message || String(e);
    return {
      erro: `Falha ao atualizar status da nota: ${msg}`,
    };
  }
};

async function sincronizarPorOsInterno(
  tenantId = SINGLE_TENANT_ID,
  osId,
  modeloDocumento = "NFSE",
  usuarioId = null,
) {
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
  const provider = await resolveFiscalProvider({
    modeloDocumento: modelo,
    provedor: nf.provedor,
    tenantId,
  });
  const label = modelo === "NFE" ? "NF-e" : "NFS-e";

  if (
    provider.id === FISCAL_PROVIDERS.NOTAAS &&
    nf.status === "autorizada" &&
    nf.id_provedor &&
    provider.isConfigured()
  ) {
    const consulta = await provider.consultar(nf.id_provedor);
    if (consulta.ok) {
      const campos = camposFromRespostaNuvem(
        consulta.data,
        valorOs,
        modelo,
        provider.rotulo,
      );
      const atualizada = await persistirAtualizacaoNf(
        nf.id,
        tenantId,
        osId,
        { ...campos, idProvedor: campos.idProvedor || nf.id_provedor },
        modelo,
      );
      return {
        nf: mapNfParaRespostaApi(atualizada),
        message: `${label}: tributos atualizados.`,
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
  if (!provider.isConfigured()) {
    return {
      nf: mapNfParaRespostaApi(nf),
      message: nf.mensagem_status || provider.mensagemNaoConfigurado(),
    };
  }
  if (!nf.id_provedor) {
    return {
      erro: `Esta ${label} ainda não tem ID na ${provider.rotulo}. Use o botão Gerar.`,
    };
  }

  if (provider.id === FISCAL_PROVIDERS.BRASIL_NFE) {
    return {
      nf: mapNfParaRespostaApi(nf),
      message:
        "Status local da NF-e. Consulta remota na Brasil NFe ainda não está implementada.",
    };
  }

  let consulta = await provider.consultar(nf.id_provedor);
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
      erro: consulta.mensagem || `Falha ao consultar ${label}.`,
    };
  }

  let campos = camposFromRespostaNuvem(
    consulta.data,
    valorOs,
    modelo,
    provider.rotulo,
  );

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

  if (campos.status === "autorizada" || campos.status === "rejeitada") {
    await registrarEventoFiscal({
      tenantId,
      usuarioId,
      ordemServicoId: osId,
      notaFiscalId: nf.id,
      modelo,
      provedor: provider.id,
      evento: eventoFiscalPorStatus(modelo, campos.status),
      status: campos.status,
    });
  }

  return {
    nf: mapNfParaRespostaApi(atualizada),
    message: campos.mensagem,
  };
}
