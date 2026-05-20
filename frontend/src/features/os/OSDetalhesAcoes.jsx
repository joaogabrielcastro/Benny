import { Link } from "react-router-dom";
import {
  FiEdit2,
  FiPlay,
  FiCheck,
  FiX,
  FiPrinter,
  FiArrowLeft,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";

function ActionBtn({ children, className = "", icon: Icon, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
    </button>
  );
}

export default function OSDetalhesAcoes({
  os,
  osId,
  notaFiscalServico,
  notaFiscalPecas,
  gerandoNfse,
  gerandoNfe,
  onGerarNF,
  onShowNFModal,
  onAtualizarStatus,
  onImprimir,
}) {
  const temServicos = Number(os.valor_servicos) > 0;
  const temPecas = Number(os.valor_produtos) > 0;

  const labelNfse = () => {
    if (gerandoNfse) return "Processando NFS-e…";
    if (notaFiscalServico?.status_nf === "processamento") return "Consultar NFS-e";
    if (notaFiscalServico?.status_nf === "autorizada") return "NFS-e autorizada";
    if (notaFiscalServico) return "Reemitir NFS-e";
    return "Emitir NFS-e";
  };

  const labelNfe = () => {
    if (gerandoNfe) return "Processando NF-e…";
    if (notaFiscalPecas?.status_nf === "processamento") return "Consultar NF-e";
    if (notaFiscalPecas?.status_nf === "autorizada") return "NF-e autorizada";
    if (notaFiscalPecas) return "Reemitir NF-e";
    return "Emitir NF-e";
  };

  return (
    <div className="pro-card p-6 mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ordem de serviço
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5">
            {os.numero}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Status: <span className="font-medium text-slate-700 dark:text-slate-300">{os.status}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(os.status === "Aberta" || os.status === "Em andamento") && (
            <Link
              to={`/ordens-servico/${osId}/editar`}
              className="btn-secondary"
            >
              <FiEdit2 className="h-4 w-4" />
              Editar
            </Link>
          )}

          {os.status === "Finalizada" && temServicos && (
            <ActionBtn
              icon={gerandoNfse ? FiRefreshCw : FiFileText}
              onClick={() => onGerarNF("NFSE")}
              disabled={gerandoNfse}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {labelNfse()}
            </ActionBtn>
          )}

          {os.status === "Finalizada" && temPecas && (
            <ActionBtn
              icon={gerandoNfe ? FiRefreshCw : FiFileText}
              onClick={() => onGerarNF("NFE")}
              disabled={gerandoNfe}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {labelNfe()}
            </ActionBtn>
          )}

          {notaFiscalServico?.status_nf === "autorizada" && (
            <ActionBtn
              icon={FiFileText}
              onClick={() => onShowNFModal("NFSE")}
              className="btn-success"
            >
              NFS-e nº {notaFiscalServico.numero}
            </ActionBtn>
          )}

          {notaFiscalPecas?.status_nf === "autorizada" && (
            <ActionBtn
              icon={FiFileText}
              onClick={() => onShowNFModal("NFE")}
              className="bg-teal-600 text-white hover:bg-teal-700"
            >
              NF-e nº {notaFiscalPecas.numero}
            </ActionBtn>
          )}

          {os.status === "Aberta" && (
            <ActionBtn
              icon={FiPlay}
              onClick={() => onAtualizarStatus("Em andamento")}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Iniciar
            </ActionBtn>
          )}

          {os.status === "Em andamento" && (
            <ActionBtn
              icon={FiCheck}
              onClick={() => onAtualizarStatus("Finalizada")}
              className="btn-success"
            >
              Finalizar
            </ActionBtn>
          )}

          {(os.status === "Aberta" || os.status === "Em andamento") && (
            <ActionBtn
              icon={FiX}
              onClick={() => onAtualizarStatus("Cancelada")}
              className="btn-danger"
            >
              Cancelar
            </ActionBtn>
          )}

          <ActionBtn
            icon={FiPrinter}
            onClick={onImprimir}
            className="btn-brand"
          >
            Imprimir
          </ActionBtn>

          <Link to="/ordens-servico" className="btn-secondary">
            <FiArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
