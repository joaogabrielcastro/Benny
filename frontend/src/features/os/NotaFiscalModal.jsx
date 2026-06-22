import toast from "react-hot-toast";
import Modal from "../../components/Modal";
import { formatarMoeda } from "../../utils/formatters";
import {
  rotuloFonteTributo,
  formatarAliquota,
} from "./fiscalUtils";
import {
  resolvePdfUrl,
  abrirDanfePdf,
  baixarDanfePdf,
} from "./notaFiscalPdf";

export default function NotaFiscalModal({
  isOpen,
  modelo,
  nota,
  os,
  onClose,
  onCancelar,
  cancelando = false,
  onCorrigirEndereco,
}) {
  const isNfe = modelo === "NFE";
  const labelDoc = isNfe ? "NF-e" : "NFS-e";
  const labelDanfe = isNfe ? "DANFE" : "DANFSe";
  const pdf = nota ? resolvePdfUrl(nota) : null;
  const pdfFilename = `${labelDoc}_${nota?.numero || nota?.id || "nota"}`;

  const handleAbrirDanfe = async () => {
    if (!pdf) {
      toast.error(
        nota?.status_nf === "autorizada"
          ? "PDF oficial indisponível. Use Atualizar status e tente novamente."
          : "Aguarde a autorização na SEFAZ/prefeitura para obter o DANFE.",
      );
      return;
    }
    await abrirDanfePdf(pdf);
  };

  const handleImprimirDanfe = async () => {
    if (!pdf) {
      toast.error("Só é possível imprimir após autorização, com o PDF oficial da Nuvem Fiscal.");
      return;
    }
    await abrirDanfePdf(pdf, { imprimir: true });
  };

  const handleBaixarDanfe = async () => {
    if (!pdf) {
      toast.error("PDF oficial indisponível.");
      return;
    }
    await baixarDanfePdf(pdf, pdfFilename);
  };

  if (!isOpen || !nota || !modelo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${labelDoc} Nº ${nota.numero}`}
      size="lg"
    >
      <div className="space-y-6">
        {pdf && nota.status_nf === "autorizada" && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/40">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-semibold">{labelDanfe} oficial</span> — mesmo
              formato de notas de fornecedores (SEFAZ / prefeitura), gerado pela
              Nuvem Fiscal. Use os botões abaixo para abrir, imprimir ou baixar o
              PDF.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
              Número NF:
            </span>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {nota.numero}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
              Data de Emissão:
            </span>
            <p className="text-lg text-gray-800 dark:text-gray-200">
              {new Date(nota.data_emissao).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
              OS:
            </span>
            <p className="text-lg text-gray-800 dark:text-gray-200">{os.numero}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
              Cliente:
            </span>
            <p className="text-lg text-gray-800 dark:text-gray-200">
              {os.cliente_nome}
            </p>
          </div>
          {nota.chave_acesso && (
            <div className="col-span-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                Chave de acesso:
              </span>
              <p className="text-xs text-gray-700 dark:text-gray-300 break-all mt-1 font-mono">
                {nota.chave_acesso}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            {isNfe ? "Valores (NF-e peças)" : "Valores e tributos (NFS-e)"}
          </h3>
          {modelo === "NFSE" && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              O valor total da NFS-e é o dos serviços prestados (o cliente não
              paga ISS em cima desse total). ISS, PIS e COFINS abaixo são
              referência/estimativa da oficina; no Simples Nacional o ISS costuma
              compor o DAS.
            </p>
          )}

          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-gray-700 dark:text-gray-300">
                {isNfe ? "Valor das peças (base):" : "Valor dos serviços (base):"}
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatarMoeda(nota.valor_base)}
              </span>
            </div>

            {modelo === "NFSE" && (
              <>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300">
                    ISS
                    {formatarAliquota(nota.aliquota_iss)
                      ? ` (${formatarAliquota(nota.aliquota_iss)})`
                      : ""}
                    {rotuloFonteTributo(nota.fonte_iss)}:
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    {formatarMoeda(nota.valor_iss)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300">
                    PIS
                    {formatarAliquota(nota.aliquota_pis)
                      ? ` (${formatarAliquota(nota.aliquota_pis)})`
                      : ""}
                    {rotuloFonteTributo(nota.fonte_pis)}:
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatarMoeda(nota.valor_pis)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-700 dark:text-gray-300">
                    COFINS
                    {formatarAliquota(nota.aliquota_cofins)
                      ? ` (${formatarAliquota(nota.aliquota_cofins)})`
                      : ""}
                    {rotuloFonteTributo(nota.fonte_cofins)}:
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    {formatarMoeda(nota.valor_cofins)}
                  </span>
                </div>
                {(nota.valor_liquido != null &&
                  Number(nota.valor_liquido) !== Number(nota.valor_total)) && (
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-gray-700 dark:text-gray-300">
                      Referência (base − ISS estimado):
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatarMoeda(nota.valor_liquido)}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between py-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 mt-3">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {isNfe ? "Valor total da NF-e:" : "Valor total da NFS-e:"}
              </span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatarMoeda(nota.valor_total)}
              </span>
            </div>
          </div>
        </div>

        {(nota.status_provedor || nota.id_provedor) && (
          <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-sm space-y-1">
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Status na Nuvem:</span>{" "}
              {nota.status_provedor || "—"}
            </p>
            {nota.id_provedor && (
              <p className="text-gray-600 dark:text-gray-400 break-all">
                <span className="font-semibold">ID na Nuvem:</span>{" "}
                {nota.id_provedor}
              </p>
            )}
            {nota.atualizado_em_nf && (
              <p className="text-gray-500 text-xs">
                Última consulta:{" "}
                {new Date(nota.atualizado_em_nf).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        )}

        {nota.detalhe_rejeicao && nota.status_nf === "rejeitada" && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/40">
            <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
              Motivo da rejeição (SEFAZ / Nuvem)
            </h4>
            <p className="text-sm text-red-900 dark:text-red-200 whitespace-pre-wrap">
              {nota.detalhe_rejeicao}
            </p>
            {isNfe && (
              <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-3">
                {/975|CSRT|hashCSRT/i.test(nota.detalhe_rejeicao || "") ? (
                  <>
                    Solicite o token CSRT na Receita/PR (UPD → Sistema → CSRT,
                    CNPJ do desenvolvedor do ERP). No Coolify:{" "}
                    <strong>NUVEM_FISCAL_RESP_TEC_CSRT_ID</strong> e{" "}
                    <strong>NUVEM_FISCAL_RESP_TEC_CSRT</strong>. A oficina pode
                    precisar autorizar o fornecedor no portal da Receita/PR.
                    Depois <strong>Reemitir NF-e</strong>.
                  </>
                ) : /972|responsavel tecnico|infRespTec/i.test(
                    nota.detalhe_rejeicao || "",
                  ) ? (
                  <>
                    Configure no Coolify:{" "}
                    <strong>NUVEM_FISCAL_RESP_TEC_CNPJ</strong> (CNPJ do
                    desenvolvedor do ERP), <strong>RESP_TEC_CONTATO</strong>,{" "}
                    <strong>RESP_TEC_EMAIL</strong>,{" "}
                    <strong>RESP_TEC_FONE</strong>. Depois{" "}
                    <strong>Reemitir NF-e</strong>.
                  </>
                ) : (
                  <>
                    Confira: <strong>NUVEM_FISCAL_EMITENTE_IE</strong>, certificado
                    A1 no painel Nuvem (NF-e homologação) e dados do cliente. Depois{" "}
                    <strong>Reemitir NF-e</strong>.
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {nota.observacoes && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
              Observações:
            </h4>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {nota.observacoes}
            </p>
          </div>
        )}

        <StatusBadge status={nota.status_nf} modelo={modelo} />

        <div className="flex flex-wrap gap-3 pt-4">
          {onCorrigirEndereco && (
            <button
              type="button"
              onClick={onCorrigirEndereco}
              className="flex-1 min-w-[10rem] px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all font-semibold"
            >
              Corrigir endereço do cliente
            </button>
          )}
          {pdf && (
            <>
              <button
                type="button"
                onClick={handleAbrirDanfe}
                className="flex-1 min-w-[10rem] px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                Abrir {labelDanfe}
              </button>
              <button
                type="button"
                onClick={handleImprimirDanfe}
                className="flex-1 min-w-[10rem] px-6 py-3 btn-brand"
              >
                Imprimir {labelDanfe}
              </button>
              <button
                type="button"
                onClick={handleBaixarDanfe}
                className="flex-1 min-w-[10rem] px-6 py-3 btn-secondary"
              >
                Baixar PDF
              </button>
            </>
          )}
          {!pdf && nota.status_nf === "autorizada" && (
            <p className="w-full text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3">
              Nota autorizada, mas o PDF ainda não está disponível. Use{" "}
              <strong>Atualizar status</strong> na OS e tente novamente em alguns
              minutos.
            </p>
          )}
          {nota.status_nf === "autorizada" && onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              disabled={cancelando}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold disabled:opacity-50"
            >
              {cancelando ? "Cancelando…" : "Cancelar nota"}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary px-6 py-3">
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StatusBadge({ status, modelo = "NFSE" }) {
  const labelDoc = modelo === "NFE" ? "NF-e" : "NFS-e";
  const cfg = {
    autorizada: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
      icon: "✓",
      label: "Nota fiscal autorizada — DANFE disponível na Nuvem Fiscal",
    },
    configuracao_pendente: {
      bg: "bg-amber-100 dark:bg-amber-900/20",
      text: "text-amber-800 dark:text-amber-200",
      icon: "⏳",
      label:
        "Integração Nuvem Fiscal: configure as variáveis no servidor e use Reprocessar NF.",
    },
    processamento: {
      bg: "bg-amber-100 dark:bg-amber-900/20",
      text: "text-amber-800 dark:text-amber-200",
      icon: "⏳",
      label:
        "Em processamento na Nuvem Fiscal — o status é atualizado automaticamente a cada ~20s ou use Atualizar status.",
    },
    erro_autenticacao: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      icon: "✕",
      label: "Falha na autenticação com a Nuvem Fiscal. Verifique CLIENT_ID / SECRET.",
    },
    rejeitada: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      icon: "✕",
      label: `${labelDoc} rejeitada na SEFAZ — veja o motivo acima e reemita`,
    },
    cancelada: {
      bg: "bg-gray-200 dark:bg-gray-700/50",
      text: "text-gray-700 dark:text-gray-300",
      icon: "—",
      label: "NFS-e cancelada na Nuvem Fiscal.",
    },
    substituida: {
      bg: "bg-gray-200 dark:bg-gray-700/50",
      text: "text-gray-700 dark:text-gray-300",
      icon: "—",
      label: "NFS-e substituída na Nuvem Fiscal.",
    },
  };

  const c = cfg[status] || {
    bg: "bg-amber-100 dark:bg-amber-900/20",
    text: "text-amber-800 dark:text-amber-200",
    icon: "⏳",
    label: `Status: ${status || "desconhecido"}`,
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg ${c.bg}`}
    >
      <span className="text-2xl">{c.icon}</span>
      <span className={`font-bold text-center ${c.text}`}>{c.label}</span>
    </div>
  );
}
