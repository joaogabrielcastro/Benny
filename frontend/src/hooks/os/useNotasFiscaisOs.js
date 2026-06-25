import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { feedbackNotaFiscal } from "../../features/os/fiscalUtils";

/**
 * Emissão, sincronização e CEP para NFS-e/NF-e de uma OS.
 */
export function useNotasFiscaisOs({
  osId,
  os,
  loading,
  notaFiscalServico,
  setNotaFiscalServico,
  notaFiscalPecas,
  setNotaFiscalPecas,
  carregarOS,
  nfeHabilitada = false,
  nfseIncluirPecas = false,
}) {
  const [showNFModal, setShowNFModal] = useState(null);
  const [gerandoNfse, setGerandoNfse] = useState(false);
  const [gerandoNfe, setGerandoNfe] = useState(false);

  const setNotaPorModelo = (modelo, nf) => {
    if (modelo === "NFE") setNotaFiscalPecas(nf);
    else setNotaFiscalServico(nf);
  };

  const notaPorModelo = (modelo) =>
    modelo === "NFE" ? notaFiscalPecas : notaFiscalServico;

  const sincronizarNotaFiscal = async (
    modelo = "NFSE",
    { silencioso = false } = {},
  ) => {
    const path =
      modelo === "NFE"
        ? `/notas-fiscais/sincronizar/os/${osId}/nfe`
        : `/notas-fiscais/sincronizar/os/${osId}/nfse`;
    const response = await api.post(path);
    const { message, nf } = response.data;
    setNotaPorModelo(modelo, nf);
    if (!silencioso) {
      feedbackNotaFiscal(toast, message, nf);
      setShowNFModal(modelo);
    } else if (nf?.status_nf === "autorizada") {
      toast.success(message || "Nota autorizada!");
      setShowNFModal(modelo);
    }
    return nf;
  };

  const handleGerarNF = async (modelo = "NFSE") => {
    if (modelo === "NFE" && !nfeHabilitada) {
      toast.error(
        "Emissão de NF-e (peças) desativada. Aguardando credenciamento SEFAZ/PR. Use NFS-e para serviços.",
      );
      return;
    }
    if (os.status !== "Finalizada") {
      toast.error("A OS precisa estar finalizada para gerar nota fiscal");
      return;
    }

    const notaAtual = notaPorModelo(modelo);
    const valorMinimo =
      modelo === "NFE"
        ? Number(os.valor_produtos)
        : nfseIncluirPecas
          ? Number(os.valor_total)
          : Number(os.valor_servicos);
    if (valorMinimo <= 0) {
      toast.error(
        modelo === "NFE"
          ? "Esta OS não tem valor de peças para NF-e."
          : nfseIncluirPecas
            ? "Esta OS não tem valor para emitir NFS-e."
            : "Esta OS não tem valor de serviços para NFS-e.",
      );
      return;
    }

    if (notaAtual?.status_nf === "autorizada") {
      toast(
        modelo === "NFE"
          ? "NF-e de peças já autorizada."
          : nfseIncluirPecas
            ? "NFS-e já autorizada."
            : "NFS-e de serviços já autorizada.",
        { icon: "ℹ️" },
      );
      setShowNFModal(modelo);
      return;
    }

    const setGerando = modelo === "NFE" ? setGerandoNfe : setGerandoNfse;
    const baseUrl =
      modelo === "NFE"
        ? `/notas-fiscais/gerar/${osId}/nfe`
        : `/notas-fiscais/gerar/${osId}/nfse`;

    try {
      setGerando(true);

      if (notaAtual?.status_nf === "processamento") {
        await sincronizarNotaFiscal(modelo);
        await carregarOS();
        return;
      }

      const url =
        notaAtual?.status_nf === "rejeitada" ? `${baseUrl}?forcar=1` : baseUrl;
      const response = await api.post(url);
      const { message, nf } = response.data;
      setNotaPorModelo(modelo, nf);
      setShowNFModal(modelo);
      feedbackNotaFiscal(toast, message, nf);
      await carregarOS();
    } catch (error) {
      toast.error(
        error.response?.data?.erro ||
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Erro ao processar nota fiscal",
      );
    } finally {
      setGerando(false);
    }
  };

  useEffect(() => {
    const nfseProc = notaFiscalServico?.status_nf === "processamento";
    const nfeProc =
      nfeHabilitada && notaFiscalPecas?.status_nf === "processamento";
    if (loading || !osId || (!nfseProc && !nfeProc)) return;

    const atualizarStatus = async () => {
      try {
        if (nfseProc) {
          const { data } = await api.post(
            `/notas-fiscais/sincronizar/os/${osId}/nfse`,
          );
          setNotaFiscalServico({ ...data.nf, _syncKey: Date.now() });
          if (data.nf?.status_nf === "autorizada") {
            toast.success(data.message || "NFS-e autorizada!");
            setShowNFModal("NFSE");
          }
        }
        if (nfeProc) {
          const { data } = await api.post(
            `/notas-fiscais/sincronizar/os/${osId}/nfe`,
          );
          setNotaFiscalPecas({ ...data.nf, _syncKey: Date.now() });
          if (data.nf?.status_nf === "autorizada") {
            toast.success(data.message || "NF-e autorizada!");
            setShowNFModal("NFE");
          }
        }
      } catch {
        /* polling silencioso */
      }
    };

    atualizarStatus();
    const timer = setInterval(atualizarStatus, 20000);
    return () => clearInterval(timer);
  }, [
    osId,
    loading,
    notaFiscalServico?.status_nf,
    notaFiscalPecas?.status_nf,
    nfeHabilitada,
    setNotaFiscalServico,
    setNotaFiscalPecas,
  ]);

  const handleCancelarNF = async (modelo = "NFSE") => {
    const nota = notaPorModelo(modelo);
    if (!nota?.id) {
      toast.error("Nota fiscal não encontrada.");
      return;
    }
    if (nota.status_nf !== "autorizada") {
      toast.error("Só é possível cancelar nota autorizada.");
      return;
    }
    const label = modelo === "NFE" ? "NF-e" : "NFS-e";
    const motivo = window.prompt(
      `Motivo do cancelamento da ${label} (mín. 15 caracteres):`,
      "Cancelamento solicitado pelo emitente conforme acordo com o cliente.",
    );
    if (motivo === null) return;
    if (motivo.trim().length < 15) {
      toast.error("Informe um motivo com pelo menos 15 caracteres.");
      return;
    }
    try {
      const { data } = await api.put(`/notas-fiscais/${nota.id}/cancelar`, {
        motivo: motivo.trim(),
      });
      setNotaPorModelo(modelo, data.nf);
      toast.success(data.message || `${label} cancelada.`);
      setShowNFModal(modelo);
      await carregarOS();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.erro ||
          `Erro ao cancelar ${label}`,
      );
    }
  };

  const notaFiscalModal =
    showNFModal && (showNFModal !== "NFE" || nfeHabilitada)
      ? notaPorModelo(showNFModal)
      : null;

  return {
    showNFModal,
    setShowNFModal,
    gerandoNfse,
    gerandoNfe,
    handleGerarNF,
    handleCancelarNF,
    sincronizarNotaFiscal,
    notaFiscalModal,
    notaFiscalServico,
    notaFiscalPecas,
  };
}
