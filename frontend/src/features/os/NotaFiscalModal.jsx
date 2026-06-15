import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import Modal from "../../components/Modal";
import { formatarMoeda } from "../../utils/formatters";
import {
  rotuloFonteTributo,
  formatarAliquota,
} from "./fiscalUtils";
import NotaFiscalImpressao from "./NotaFiscalImpressao";

function imprimirPdf(url) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(url, "_blank", "noopener,noreferrer");
        toast("Abra o PDF na nova aba e use Ctrl+P para imprimir.", {
          icon: "ℹ️",
        });
      }
      setTimeout(() => iframe.remove(), 3000);
    }, 400);
  };
}

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
  const impressaoRef = useRef(null);

  const pdfHref = nota
    ? (() => {
        const raw = nota.link_pdf || nota.pdf_path;
        if (!raw) return null;
        if (/^https?:\/\//i.test(raw)) return raw;
        return `/api/storage/${raw.replace(/^storage\//, "")}`;
      })()
    : null;

  const handlePrintResumo = useReactToPrint({
    contentRef: impressaoRef,
    documentTitle: `${modelo === "NFE" ? "NFE" : "NFSE"}_${nota?.numero || "nota"}`,
  });

  const handleImprimir = () => {
    if (pdfHref && nota?.status_nf === "autorizada") {
      imprimirPdf(pdfHref);
      return;
    }
    handlePrintResumo();
  };

  if (!isOpen || !nota || !modelo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${modelo === "NFE" ? "NF-e" : "NFS-e"} Nº ${nota.numero}`}
      size="lg"
    >
      <div className="space-y-6">
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
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            {modelo === "NFE"
              ? "Valores (NF-e peças)"
              : "Valores e tributos (NFS-e)"}
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
                {modelo === "NFE"
                  ? "Valor das peças (base):"
                  : "Valor dos serviços (base):"}
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
                {modelo === "NFE"
                  ? "Valor total da NF-e:"
                  : "Valor total da NFS-e:"}
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

        <StatusBadge status={nota.status_nf} />

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
          {pdfHref && (
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-center"
            >
              🔗 Abrir PDF
            </a>
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
          <button
            type="button"
            onClick={handleImprimir}
            className="flex-1 px-6 py-3 btn-brand"
          >
            Imprimir NF
          </button>
          <button type="button" onClick={onClose} className="btn-secondary px-6 py-3">
            Fechar
          </button>
        </div>
      </div>

      <div className="hidden">
        <NotaFiscalImpressao
          ref={impressaoRef}
          modelo={modelo}
          nota={nota}
          os={os}
        />
      </div>
    </Modal>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    autorizada: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
      icon: "✓",
      label: "Nota fiscal autorizada",
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
      label: "Emissão rejeitada ou com erro. Veja a mensagem acima (detalhes da API).",
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
