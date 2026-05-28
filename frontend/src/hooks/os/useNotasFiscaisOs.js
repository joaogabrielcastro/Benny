import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { feedbackNotaFiscal } from "../../features/os/fiscalUtils";
import { removerMascara, mascaraCEP } from "../../utils/masks";

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
}) {
  const [showNFModal, setShowNFModal] = useState(null);
  const [gerandoNfse, setGerandoNfse] = useState(false);
  const [gerandoNfe, setGerandoNfe] = useState(false);
  const [cepClienteEdicao, setCepClienteEdicao] = useState("");
  const [salvandoCepCliente, setSalvandoCepCliente] = useState(false);

  useEffect(() => {
    if (os?.cliente_cep != null && os.cliente_cep !== "") {
      setCepClienteEdicao(mascaraCEP(os.cliente_cep));
    } else {
      setCepClienteEdicao("");
    }
  }, [os?.id, os?.cliente_cep]);

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
    if (os.status !== "Finalizada") {
      toast.error("A OS precisa estar finalizada para gerar nota fiscal");
      return;
    }

    const notaAtual = notaPorModelo(modelo);
    const valorMinimo =
      modelo === "NFE" ? Number(os.valor_produtos) : Number(os.valor_servicos);
    if (valorMinimo <= 0) {
      toast.error(
        modelo === "NFE"
          ? "Esta OS não tem valor de peças para NF-e."
          : "Esta OS não tem valor de serviços para NFS-e.",
      );
      return;
    }

    if (notaAtual?.status_nf === "autorizada") {
      toast(
        modelo === "NFE"
          ? "NF-e de peças já autorizada."
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
    const nfeProc = notaFiscalPecas?.status_nf === "processamento";
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
    setNotaFiscalServico,
    setNotaFiscalPecas,
  ]);

  const clienteCepValidoParaNfse =
    String(os?.cliente_cep || "").replace(/\D/g, "").length === 8;

  const salvarCepCliente = async () => {
    const d = removerMascara(cepClienteEdicao);
    if (d.length !== 8) {
      toast.error("Informe um CEP com 8 dígitos.");
      return;
    }
    if (!os?.cliente_id) {
      toast.error("OS sem cliente vinculado.");
      return;
    }
    try {
      setSalvandoCepCliente(true);
      const { data: c } = await api.get(`/clientes/${os.cliente_id}`);
      await api.put(`/clientes/${os.cliente_id}`, {
        nome: c.nome,
        telefone: c.telefone,
        cpf_cnpj: c.cpf_cnpj,
        email: c.email ?? "",
        endereco: c.endereco ?? "",
        cep: d,
        numero: c.numero ?? "",
        complemento: c.complemento ?? "",
        bairro: c.bairro ?? "",
        cidade: c.cidade ?? "",
        estado: c.estado ?? "",
      });
      toast.success("CEP do cliente atualizado.");
      await carregarOS();
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Erro ao salvar CEP",
      );
    } finally {
      setSalvandoCepCliente(false);
    }
  };

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

  const notaFiscalModal = showNFModal ? notaPorModelo(showNFModal) : null;

  return {
    showNFModal,
    setShowNFModal,
    gerandoNfse,
    gerandoNfe,
    cepClienteEdicao,
    setCepClienteEdicao,
    salvandoCepCliente,
    clienteCepValidoParaNfse,
    salvarCepCliente,
    handleGerarNF,
    handleCancelarNF,
    sincronizarNotaFiscal,
    notaFiscalModal,
    notaFiscalServico,
    notaFiscalPecas,
  };
}
