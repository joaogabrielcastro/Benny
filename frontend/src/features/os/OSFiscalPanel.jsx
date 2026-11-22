import { Link } from "react-router-dom";
import { FiFileText, FiRefreshCw, FiAlertTriangle, FiExternalLink, FiInfo } from "react-icons/fi";
import Section from "../../components/ui/Section";
import StatusBadge from "../../components/ui/StatusBadge";
import { nfseValorIncompleto, mensagemRejeicaoNota } from "./fiscalUtils";
import { formatarDataHora } from "../../utils/formatters";

function numeroValido(n) {
  return /^\d{1,15}$/.test(String(n || ""));
}

function LinhaNota({ titulo, nota, onAbrir }) {
  if (!nota) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5">
        <span className="text-sm text-ink-700 dark:text-ink-300">{titulo}</span>
        <span className="text-xs text-ink-400">Não emitida</span>
      </div>
    );
  }
  const rejeitada = nota.status_nf === "rejeitada" || nota.status_nf === "erro_autenticacao";
  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onAbrir} className="text-left min-w-0 group">
          <span className="block text-sm font-medium text-ink-900 dark:text-white group-hover:text-brand-600">
            {titulo}
            {numeroValido(nota.numero) && <span className="num"> nº {nota.numero}</span>}
          </span>
          {nota.atualizado_em_nf && (
            <span className="block text-2xs text-ink-500">Atualizada {formatarDataHora(nota.atualizado_em_nf)}</span>
          )}
        </button>
        <StatusBadge kind="nf" status={nota.status_nf} size="sm" />
      </div>
      {nota.status_nf === "processamento" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <FiRefreshCw className="h-3 w-3 animate-spin" />
          Aguardando retorno do provedor — o status é consultado automaticamente.
        </p>
      )}
      {rejeitada && (
        <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200/70 dark:border-red-900/60 p-2.5 text-xs text-red-800 dark:text-red-200">
          <p className="flex items-center gap-1.5 font-semibold">
            <FiAlertTriangle className="h-3.5 w-3.5" /> Motivo da rejeição
          </p>
          <p className="mt-1 whitespace-pre-line break-words">
            {mensagemRejeicaoNota(nota) || nota.observacoes || "Consulte os detalhes da nota."}
          </p>
          <button type="button" onClick={onAbrir} className="mt-1.5 font-semibold underline underline-offset-2">
            Ver detalhes
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Painel fiscal da OS. Mantém exatamente as regras anteriores de quando cada
 * botão aparece (OS finalizada, valor de serviços/peças, NF-e habilitada).
 */
export default function OSFiscalPanel({
  os,
  notaFiscalServico,
  notaFiscalPecas,
  gerandoNfse,
  gerandoNfe,
  onGerarNF,
  onShowNFModal,
  nfeHabilitada,
  nfseIncluirPecas,
}) {
  const temServicos = Number(os.valor_servicos) > 0;
  const temPecas = Number(os.valor_produtos) > 0;
  const temValorNfse = nfseIncluirPecas ? Number(os.valor_total) > 0 : temServicos;
  const nfseIncompleta = nfseValorIncompleto(os, notaFiscalServico, nfseIncluirPecas);
  const finalizada = os.status === "Finalizada";

  const labelNfse = () => {
    if (gerandoNfse) return "Processando NFS-e…";
    if (notaFiscalServico?.status_nf === "processamento") return "Consultar NFS-e";
    if (nfseIncompleta) return "Reemitir NFS-e (valor completo)";
    if (notaFiscalServico?.status_nf === "autorizada") return "Ver NFS-e";
    if (notaFiscalServico) return "Reemitir NFS-e";
    return nfseIncluirPecas && temPecas ? "Emitir NFS-e (serviços + peças)" : "Emitir NFS-e";
  };
  const labelNfe = () => {
    if (gerandoNfe) return "Processando NF-e…";
    if (notaFiscalPecas?.status_nf === "processamento") return "Consultar NF-e";
    if (notaFiscalPecas?.status_nf === "autorizada") return "Ver NF-e";
    if (notaFiscalPecas) return "Reemitir NF-e";
    return "Emitir NF-e de peças";
  };

  const destaqueNfse =
    nfseIncompleta || notaFiscalServico?.status_nf === "rejeitada" ? "btn-warning" : notaFiscalServico?.status_nf === "autorizada" ? "btn-secondary" : "btn-brand";

  return (
    <Section title="Nota fiscal" icon={FiFileText}>
      <div className="divide-y divide-ink-100 dark:divide-ink-800 -mt-2">
        <LinhaNota
          titulo="NFS-e (serviços)"
          nota={notaFiscalServico}
          onAbrir={() => onShowNFModal("NFSE")}
        />
        {nfeHabilitada && (
          <LinhaNota titulo="NF-e (peças)" nota={notaFiscalPecas} onAbrir={() => onShowNFModal("NFE")} />
        )}
      </div>

      {!finalizada ? (
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-500">
          <FiInfo className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          A emissão é liberada quando a OS for finalizada.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {temValorNfse && (
            <button
              type="button"
              onClick={() => onGerarNF("NFSE")}
              disabled={gerandoNfse}
              className={`${destaqueNfse} w-full`}
            >
              {gerandoNfse ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiFileText className="h-4 w-4" />}
              {labelNfse()}
            </button>
          )}
          {nfeHabilitada && temPecas && (
            <button
              type="button"
              onClick={() => onGerarNF("NFE")}
              disabled={gerandoNfe}
              className="btn-secondary w-full"
            >
              {gerandoNfe ? <FiRefreshCw className="h-4 w-4 animate-spin" /> : <FiFileText className="h-4 w-4" />}
              {labelNfe()}
            </button>
          )}
          {!temValorNfse && !(nfeHabilitada && temPecas) && (
            <p className="text-xs text-ink-500">Esta OS não tem valor tributável para emissão.</p>
          )}
          <Link to="/notas-fiscais" className="text-xs link-pro inline-flex items-center gap-1 self-start mt-1">
            Histórico de notas <FiExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </Section>
  );
}
