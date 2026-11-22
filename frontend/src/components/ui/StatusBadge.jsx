import { TONES, statusTone, statusLabel } from "../../utils/statusColors";

/**
 * Badge de status unificado.
 * @param {{kind: "os"|"orcamento"|"nf"|"pagamento"|"situacaoPagamento"|"conta"|"agendamento", status: string, size?: "sm"|"md", className?: string}} props
 */
export default function StatusBadge({ kind = "os", status, size = "md", className = "" }) {
  const tone = TONES[statusTone(kind, status)];
  const sz = size === "sm" ? "text-2xs px-1.5 py-0" : "";
  return (
    <span className={`badge-status ${tone.badge} ${sz} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {statusLabel(kind, status)}
    </span>
  );
}
