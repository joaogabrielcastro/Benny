import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import api from "../services/api";
import OSImpressao from "../components/OSImpressao";
import Modal from "../components/Modal";
import BuscaCEP from "../components/BuscaCEP";
import { mascaraCEP, removerMascara } from "../utils/masks";

function rotuloFonteTributo(fonte) {
  if (fonte === "nuvem") return " · Nuvem Fiscal";
  if (fonte === "estimativa") return " · estimativa";
  return "";
}

function formatarAliquota(p) {
  if (p == null || p === "") return "";
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export default function OSDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [os, setOS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notaFiscalServico, setNotaFiscalServico] = useState(null);
  const [notaFiscalPecas, setNotaFiscalPecas] = useState(null);
  const [showNFModal, setShowNFModal] = useState(null);
  const [gerandoNfse, setGerandoNfse] = useState(false);
  const [gerandoNfe, setGerandoNfe] = useState(false);
  const [cepClienteEdicao, setCepClienteEdicao] = useState("");
  const [salvandoCepCliente, setSalvandoCepCliente] = useState(false);
  const componentRef = useRef();

  useEffect(() => {
    carregarOS();
  }, [id]);

  useEffect(() => {
    if (os?.cliente_cep != null && os.cliente_cep !== "") {
      setCepClienteEdicao(mascaraCEP(os.cliente_cep));
    } else {
      setCepClienteEdicao("");
    }
  }, [os?.id, os?.cliente_cep]);

  const carregarOS = async () => {
    try {
      const response = await api.get(`/ordens-servico/${id}`);
      setOS(response.data);

      try {
        const nfResponse = await api.get(`/notas-fiscais/os/${id}`);
        const lista = Array.isArray(nfResponse.data) ? nfResponse.data : [];
        setNotaFiscalServico(
          lista.find((n) => n.modelo_documento === "NFSE") || null,
        );
        setNotaFiscalPecas(
          lista.find((n) => n.modelo_documento === "NFE") || null,
        );
      } catch (error) {
        if (response.data.nf_id) {
          try {
            const legado = await api.get(
              `/notas-fiscais/${response.data.nf_id}`,
            );
            setNotaFiscalServico(legado.data);
          } catch (e) {
            console.error("Erro ao carregar nota fiscal:", e);
          }
        } else {
          setNotaFiscalServico(null);
          setNotaFiscalPecas(null);
        }
      }

      setLoading(false);
    } catch (error) {
      toast.error("Erro ao carregar OS");
      navigate("/ordens-servico");
    }
  };

  const handleAtualizarStatus = async (novoStatus) => {
    try {
      await api.put(`/ordens-servico/${id}`, {
        status: novoStatus,
        responsavel_tecnico: os.responsavel_tecnico,
      });
      toast.success("Status atualizado com sucesso!");
      carregarOS();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const feedbackNotaFiscal = (message, nf) => {
    const st = nf?.status_nf;
    if (st === "autorizada") {
      toast.success(message || "Nota fiscal autorizada na Nuvem Fiscal.");
    } else if (st === "configuracao_pendente") {
      toast.error(
        message ||
          "Nuvem Fiscal não configurada neste servidor. Defina as variáveis no ambiente de produção.",
        { duration: 8000 },
      );
    } else if (st === "erro_autenticacao" || st === "rejeitada") {
      toast.error(message || "Falha na NFS-e na Nuvem Fiscal.");
    } else if (st === "processamento") {
      toast(message || "NFS-e ainda em processamento. Aguarde ou tente Atualizar status.", {
        icon: "⏳",
        duration: 6000,
      });
    } else {
      toast(message || "Registro de NF atualizado.", { duration: 5000 });
    }
  };

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
        ? `/notas-fiscais/sincronizar/os/${id}/nfe`
        : `/notas-fiscais/sincronizar/os/${id}/nfse`;
    const response = await api.post(path);
    const { message, nf } = response.data;
    setNotaPorModelo(modelo, nf);
    if (!silencioso) {
      feedbackNotaFiscal(message, nf);
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
      toast.info(
        modelo === "NFE"
          ? "NF-e de peças já autorizada."
          : "NFS-e de serviços já autorizada.",
      );
      setShowNFModal(modelo);
      return;
    }

    const setGerando = modelo === "NFE" ? setGerandoNfe : setGerandoNfse;
    const baseUrl =
      modelo === "NFE"
        ? `/notas-fiscais/gerar/${id}/nfe`
        : `/notas-fiscais/gerar/${id}/nfse`;

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
      feedbackNotaFiscal(message, nf);
      await carregarOS();
    } catch (error) {
      toast.error(
        error.response?.data?.erro ||
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
    if (loading || (!nfseProc && !nfeProc)) return;

    const atualizarStatus = async () => {
      try {
        if (nfseProc) {
          const { data } = await api.post(
            `/notas-fiscais/sincronizar/os/${id}/nfse`,
          );
          setNotaFiscalServico({ ...data.nf, _syncKey: Date.now() });
          if (data.nf?.status_nf === "autorizada") {
            toast.success(data.message || "NFS-e autorizada!");
            setShowNFModal("NFSE");
          }
        }
        if (nfeProc) {
          const { data } = await api.post(
            `/notas-fiscais/sincronizar/os/${id}/nfe`,
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
    id,
    loading,
    notaFiscalServico?.status_nf,
    notaFiscalPecas?.status_nf,
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

  const handleImprimir = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `OS_${os?.numero}`,
  });

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!os) {
    return <div className="text-center py-8">OS não encontrada</div>;
  }

  const notaFiscalModal = showNFModal ? notaPorModelo(showNFModal) : null;
  const temServicos = Number(os.valor_servicos) > 0;
  const temPecas = Number(os.valor_produtos) > 0;

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              Ordem de Serviço
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1 text-lg">
              {os.numero}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(os.status === "Aberta" || os.status === "Em andamento") && (
              <Link
                to={`/ordens-servico/${id}/editar`}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
              >
                ✏️ Editar
              </Link>
            )}
            {os.status === "Finalizada" && temServicos && (
              <button
                onClick={() => handleGerarNF("NFSE")}
                disabled={gerandoNfse}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {gerandoNfse
                  ? "⏳ Aguarde..."
                  : notaFiscalServico?.status_nf === "processamento"
                    ? "🔄 NFS-e status"
                    : notaFiscalServico?.status_nf === "autorizada"
                      ? "✓ NFS-e ok"
                      : notaFiscalServico
                        ? "📄 Reemitir NFS-e"
                        : "📄 NFS-e serviços"}
              </button>
            )}
            {os.status === "Finalizada" && temPecas && (
              <button
                onClick={() => handleGerarNF("NFE")}
                disabled={gerandoNfe}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {gerandoNfe
                  ? "⏳ Aguarde..."
                  : notaFiscalPecas?.status_nf === "processamento"
                    ? "🔄 NF-e status"
                    : notaFiscalPecas?.status_nf === "autorizada"
                      ? "✓ NF-e ok"
                      : notaFiscalPecas
                        ? "📄 Reemitir NF-e"
                        : "📄 NF-e peças"}
              </button>
            )}
            {notaFiscalServico?.status_nf === "autorizada" && (
              <button
                onClick={() => setShowNFModal("NFSE")}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
              >
                📄 NFS-e ({notaFiscalServico.numero})
              </button>
            )}
            {notaFiscalPecas?.status_nf === "autorizada" && (
              <button
                onClick={() => setShowNFModal("NFE")}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
              >
                📄 NF-e ({notaFiscalPecas.numero})
              </button>
            )}
            {os.status === "Aberta" && (
              <button
                onClick={() => handleAtualizarStatus("Em andamento")}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                ▶️ Iniciar
              </button>
            )}
            {os.status === "Em andamento" && (
              <button
                onClick={() => handleAtualizarStatus("Finalizada")}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                ✓ Finalizar
              </button>
            )}
            {(os.status === "Aberta" || os.status === "Em andamento") && (
              <button
                onClick={() => handleAtualizarStatus("Cancelada")}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                ✕ Cancelar
              </button>
            )}
            <button
              onClick={handleImprimir}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2"
            >
              🖨️ Imprimir
            </button>
            <Link
              to="/ordens-servico"
              className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-semibold"
            >
              ← Voltar
            </Link>
          </div>
        </div>
      </div>

      {os.status === "Finalizada" && !clienteCepValidoParaNfse && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <p className="text-sm text-amber-950 dark:text-amber-100 font-medium">
            Para emitir NFS-e na Nuvem Fiscal é obrigatório o CEP do tomador (8
            dígitos) no cadastro do cliente{" "}
            <span className="font-semibold">{os.cliente_nome}</span>. Em
            homologação você pode definir{" "}
            <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
              NUVEM_FISCAL_TOMADOR_CEP
            </code>{" "}
            no servidor como alternativa.
          </p>
          <div className="mt-4 flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1 min-w-0">
              <BuscaCEP
                value={cepClienteEdicao}
                onChange={setCepClienteEdicao}
                onEnderecoEncontrado={(end) => {
                  setCepClienteEdicao(mascaraCEP(end.cep || ""));
                }}
              />
            </div>
            <button
              type="button"
              onClick={salvarCepCliente}
              disabled={salvandoCepCliente}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvandoCepCliente ? "Salvando…" : "Salvar CEP no cliente"}
            </button>
          </div>
        </div>
      )}

      {/* Badge de Status */}
      <div className="flex items-center gap-3">
        <span
          className={`px-6 py-3 rounded-xl font-bold text-lg ${
            os.status === "Aberta"
              ? "bg-blue-100 text-blue-700"
              : os.status === "Em andamento"
                ? "bg-yellow-100 text-yellow-700"
                : os.status === "Finalizada"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
          }`}
        >
          {os.status}
        </span>
        <span className="text-gray-600 dark:text-gray-300">
          Data: {new Date(os.criado_em).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {/* Grid de Informações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados do Cliente */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            👤 Cliente
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                Nome:
              </span>
              <p className="text-lg text-gray-800 dark:text-gray-200">
                {os.cliente_nome}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                Telefone:
              </span>
              <p className="text-lg text-gray-800 dark:text-gray-200">
                {os.cliente_telefone || "Não informado"}
              </p>
            </div>
            {os.cliente_cpf_cnpj && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  CPF/CNPJ:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.cliente_cpf_cnpj}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dados do Veículo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            🚗 Veículo
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                Modelo:
              </span>
              <p className="text-lg text-gray-800 dark:text-gray-200">
                {os.veiculo_modelo}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Placa:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.veiculo_placa}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Cor:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.veiculo_cor}
                </p>
              </div>
            </div>
            {os.km && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  KM:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.km.toLocaleString()}
                </p>
              </div>
            )}
            {os.observacoes_veiculo && (
              <div className="mt-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Observações:
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {os.observacoes_veiculo}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Produtos Utilizados */}
      {os.produtos && os.produtos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            📦 Produtos Utilizados
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Valor Unit.
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {os.produtos.map((produto, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {produto.codigo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {produto.descricao}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-800 dark:text-gray-200">
                      {produto.quantidade}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-gray-200">
                      {formatarMoeda(produto.valor_unitario)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                      {formatarMoeda(produto.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 dark:bg-gray-700 font-semibold">
                  <td
                    colSpan="4"
                    className="px-4 py-3 text-right text-gray-800 dark:text-gray-200"
                  >
                    Subtotal Produtos:
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                    {formatarMoeda(os.valor_produtos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Serviços Realizados */}
      {os.servicos && os.servicos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            🔧 Serviços Realizados
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Qtd
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Valor Unit.
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {os.servicos.map((servico, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {servico.codigo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {servico.descricao}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-800 dark:text-gray-200">
                      {servico.quantidade}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-gray-200">
                      {formatarMoeda(servico.valor_unitario)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                      {formatarMoeda(servico.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-50 dark:bg-gray-700 font-semibold">
                  <td
                    colSpan="4"
                    className="px-4 py-3 text-right text-gray-800 dark:text-gray-200"
                  >
                    Subtotal Serviços:
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                    {formatarMoeda(os.valor_servicos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Valor Total */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center text-white">
          <span className="text-2xl font-bold">VALOR TOTAL DA OS:</span>
          <span className="text-4xl font-bold">
            {formatarMoeda(os.valor_total)}
          </span>
        </div>
      </div>

      {/* Observações Gerais */}
      {os.observacoes_gerais && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            📝 Observações Gerais
          </h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {os.observacoes_gerais}
          </p>
        </div>
      )}

      {/* Responsável Técnico */}
      {os.responsavel_tecnico && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            👨‍🔧 Responsável Técnico
          </h2>
          <p className="text-lg text-gray-800 dark:text-gray-200">
            {os.responsavel_tecnico}
          </p>
        </div>
      )}

      {/* Componente de Impressão (oculto) */}
      <OSImpressao ref={componentRef} os={os} />

      {/* Modal de Nota Fiscal */}
      {notaFiscalModal && (
        <Modal
          isOpen={!!showNFModal}
          onClose={() => setShowNFModal(null)}
          title={`${showNFModal === "NFE" ? "NF-e" : "NFS-e"} Nº ${notaFiscalModal.numero}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Informações da NF */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Número NF:
                </span>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {notaFiscalModal.numero}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Data de Emissão:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {new Date(notaFiscalModal.data_emissao).toLocaleDateString(
                    "pt-BR",
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  OS:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.numero}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  Cliente:
                </span>
                <p className="text-lg text-gray-800 dark:text-gray-200">
                  {os.cliente_nome}
                </p>
              </div>
            </div>

            {/* Valores */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                {showNFModal === "NFE"
                  ? "Valores (NF-e peças)"
                  : "Valores e tributos (NFS-e)"}
              </h3>
              {showNFModal === "NFSE" && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tributos da Nuvem Fiscal quando disponíveis; senão, estimativa
                  com NUVEM_FISCAL_ALIQUOTA_ISS (2% Colombo) no servidor.
                </p>
              )}

              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300">
                    {showNFModal === "NFE"
                      ? "Valor das peças (base):"
                      : "Valor dos serviços (base):"}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatarMoeda(notaFiscalModal.valor_base)}
                  </span>
                </div>

                {showNFModal === "NFSE" && (
                <>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300">
                    ISS
                    {formatarAliquota(notaFiscalModal.aliquota_iss)
                      ? ` (${formatarAliquota(notaFiscalModal.aliquota_iss)})`
                      : ""}
                    {rotuloFonteTributo(notaFiscalModal.fonte_iss)}:
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    {formatarMoeda(notaFiscalModal.valor_iss)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300">
                    PIS
                    {formatarAliquota(notaFiscalModal.aliquota_pis)
                      ? ` (${formatarAliquota(notaFiscalModal.aliquota_pis)})`
                      : ""}
                    {rotuloFonteTributo(notaFiscalModal.fonte_pis)}:
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatarMoeda(notaFiscalModal.valor_pis)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300">
                    COFINS
                    {formatarAliquota(notaFiscalModal.aliquota_cofins)
                      ? ` (${formatarAliquota(notaFiscalModal.aliquota_cofins)})`
                      : ""}
                    {rotuloFonteTributo(notaFiscalModal.fonte_cofins)}:
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatarMoeda(notaFiscalModal.valor_cofins)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300">
                    Valor líquido (base − ISS):
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatarMoeda(
                      notaFiscalModal.valor_liquido ?? notaFiscalModal.valor_total,
                    )}
                  </span>
                </div>
                </>
                )}

                <div className="flex justify-between py-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 mt-3">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {showNFModal === "NFE"
                      ? "Valor total da NF-e:"
                      : "Valor total da NFS-e:"}
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatarMoeda(notaFiscalModal.valor_total)}
                  </span>
                </div>
              </div>
            </div>

            {(notaFiscalModal.status_provedor || notaFiscalModal.id_provedor) && (
              <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-sm space-y-1">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Status na Nuvem:</span>{" "}
                  {notaFiscalModal.status_provedor || "—"}
                </p>
                {notaFiscalModal.id_provedor && (
                  <p className="text-gray-600 dark:text-gray-400 break-all">
                    <span className="font-semibold">ID na Nuvem:</span>{" "}
                    {notaFiscalModal.id_provedor}
                  </p>
                )}
                {notaFiscalModal.atualizado_em_nf && (
                  <p className="text-gray-500 text-xs">
                    Última consulta:{" "}
                    {new Date(notaFiscalModal.atualizado_em_nf).toLocaleString(
                      "pt-BR",
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Observações da NF */}
            {notaFiscalModal.observacoes && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Observações:
                </h4>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {notaFiscalModal.observacoes}
                </p>
              </div>
            )}

            {/* Status da NF */}
            <div
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg ${
                notaFiscalModal.status_nf === "autorizada"
                  ? "bg-green-100 dark:bg-green-900/30"
                  : notaFiscalModal.status_nf === "erro_autenticacao" ||
                      notaFiscalModal.status_nf === "rejeitada"
                    ? "bg-red-100 dark:bg-red-900/30"
                    : notaFiscalModal.status_nf === "cancelada" ||
                        notaFiscalModal.status_nf === "substituida"
                      ? "bg-gray-200 dark:bg-gray-700/50"
                      : "bg-amber-100 dark:bg-amber-900/20"
              }`}
            >
              <span className="text-2xl">
                {notaFiscalModal.status_nf === "autorizada"
                  ? "✓"
                  : notaFiscalModal.status_nf === "erro_autenticacao" ||
                      notaFiscalModal.status_nf === "rejeitada"
                    ? "✕"
                    : notaFiscalModal.status_nf === "cancelada" ||
                        notaFiscalModal.status_nf === "substituida"
                      ? "—"
                      : "⏳"}
              </span>
              <span
                className={`font-bold text-center ${
                  notaFiscalModal.status_nf === "autorizada"
                    ? "text-green-700 dark:text-green-400"
                    : notaFiscalModal.status_nf === "erro_autenticacao" ||
                        notaFiscalModal.status_nf === "rejeitada"
                      ? "text-red-700 dark:text-red-400"
                      : notaFiscalModal.status_nf === "cancelada" ||
                          notaFiscalModal.status_nf === "substituida"
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-amber-800 dark:text-amber-200"
                }`}
              >
                {notaFiscalModal.status_nf === "autorizada"
                  ? "Nota fiscal autorizada"
                  : notaFiscalModal.status_nf === "configuracao_pendente"
                    ? "Integração Nuvem Fiscal: configure as variáveis no servidor e use Reprocessar NF."
                    : notaFiscalModal.status_nf === "processamento"
                      ? "Em processamento na Nuvem Fiscal — o status é atualizado automaticamente a cada ~20s ou use Atualizar status."
                      : notaFiscalModal.status_nf === "erro_autenticacao"
                        ? "Falha na autenticação com a Nuvem Fiscal. Verifique CLIENT_ID / SECRET."
                        : notaFiscalModal.status_nf === "rejeitada"
                          ? "Emissão rejeitada ou com erro. Veja a mensagem acima (detalhes da API)."
                          : notaFiscalModal.status_nf === "cancelada"
                            ? "NFS-e cancelada na Nuvem Fiscal."
                            : notaFiscalModal.status_nf === "substituida"
                              ? "NFS-e substituída na Nuvem Fiscal."
                              : `Status: ${notaFiscalModal.status_nf || "desconhecido"}`}
              </span>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-4">
              {(notaFiscalModal.link_pdf || notaFiscalModal.pdf_path) && (
                <a
                  href={(() => {
                    const raw = notaFiscalModal.link_pdf || notaFiscalModal.pdf_path;
                    if (!raw) return "#";
                    if (/^https?:\/\//i.test(raw)) return raw;
                    return `/api/storage/${raw.replace(/^storage\//, "")}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-center"
                >
                  🔗 Abrir PDF
                </a>
              )}
              <button
                onClick={() => window.print()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                🖨️ Imprimir NF
              </button>
              <button
                onClick={() => setShowNFModal(null)}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
