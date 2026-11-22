import { useQuery } from "@tanstack/react-query";
import { FiClock } from "react-icons/fi";
import api from "../../services/api";
import Section from "../../components/ui/Section";
import { formatarDataHora, formatarMoeda } from "../../utils/formatters";

const ROTULO_FISCAL = {
  NFSE_SOLICITADA: "NFS-e solicitada",
  NFSE_EMISSAO_SOLICITADA: "NFS-e solicitada",
  NFSE_AUTORIZADA: "NFS-e autorizada",
  NFSE_REJEITADA: "NFS-e rejeitada",
  NFSE_CANCELADA: "NFS-e cancelada",
  NFE_SOLICITADA: "NF-e solicitada",
  NFE_EMISSAO_SOLICITADA: "NF-e solicitada",
  NFE_AUTORIZADA: "NF-e autorizada",
  NFE_REJEITADA: "NF-e rejeitada",
  NFE_CANCELADA: "NF-e cancelada",
};

function provedorLabel(p) {
  if (p === "brasil_nfe") return "Brasil NFe";
  if (p === "notaas") return "Notaas";
  return p || null;
}

/** Converte linhas de auditoria em eventos legíveis. */
export function eventosDaAuditoria(rows = []) {
  const out = [];
  for (const row of rows) {
    const novos = row?.dados_novos || {};
    const antes = row?.dados_anteriores || {};
    const fiscal = novos.evento || row?.acao;
    const usuario = row.usuario && row.usuario !== "sistema" ? row.usuario : null;
    if (fiscal && /^(NFSE|NFE)_/.test(String(fiscal))) {
      out.push({
        quando: row.criado_em,
        tom: /REJEITADA/.test(fiscal) ? "red" : /AUTORIZADA/.test(fiscal) ? "green" : /CANCELADA/.test(fiscal) ? "gray" : "amber",
        texto: ROTULO_FISCAL[fiscal] || String(fiscal).replace(/_/g, " "),
        detalhe: [provedorLabel(novos.provedor), novos.nota_fiscal_id ? `registro #${novos.nota_fiscal_id}` : null]
          .filter(Boolean)
          .join(" · "),
        usuario,
      });
      continue;
    }
    if (row.tabela !== "ordens_servico") continue;
    if (row.acao === "UPDATE") {
      const mudancas = [];
      if (antes.status && novos.status && antes.status !== novos.status) {
        out.push({
          quando: row.criado_em,
          tom: novos.status === "Finalizada" ? "green" : novos.status === "Cancelada" ? "gray" : "blue",
          texto: `Status: ${antes.status} → ${novos.status}`,
          usuario,
        });
      }
      if (Number(antes.valor_total) !== Number(novos.valor_total) && novos.valor_total != null) {
        mudancas.push(`valor ${formatarMoeda(antes.valor_total)} → ${formatarMoeda(novos.valor_total)}`);
      }
      if (antes.km !== novos.km && novos.km != null) mudancas.push(`km ${novos.km}`);
      if (antes.responsavel_tecnico !== novos.responsavel_tecnico && novos.responsavel_tecnico)
        mudancas.push(`responsável ${novos.responsavel_tecnico}`);
      if (antes.veiculo_id !== novos.veiculo_id) mudancas.push("veículo alterado");
      if (antes.observacoes_veiculo !== novos.observacoes_veiculo) mudancas.push("relato/diagnóstico");
      if (antes.observacoes_gerais !== novos.observacoes_gerais) mudancas.push("observações");
      if (mudancas.length) {
        out.push({ quando: row.criado_em, tom: "gray", texto: "OS atualizada", detalhe: mudancas.join(" · "), usuario });
      }
    }
  }
  return out;
}

const DOT = {
  blue: "bg-brand-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  amber: "bg-amber-500",
  gray: "bg-ink-400",
};

/**
 * Histórico da OS: abertura, mudanças de status, edições e eventos fiscais.
 * Fonte: /auditoria (somente admin).
 */
export default function OSHistorico({ os }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["ordens-servico", os.id, "historico", os.atualizado_em],
    queryFn: async () => {
      const { data } = await api.get(`/auditoria/ordens-servico/${os.id}`);
      return Array.isArray(data) ? data : [];
    },
  });

  const eventos = [
    { quando: os.criado_em, tom: "blue", texto: "OS aberta", detalhe: os.km ? `km ${Number(os.km).toLocaleString("pt-BR")}` : null },
    ...eventosDaAuditoria(rows),
  ].sort((a, b) => new Date(b.quando) - new Date(a.quando));

  return (
    <Section title="Histórico" icon={FiClock}>
      {isLoading ? (
        <div className="skeleton h-4 w-1/2" />
      ) : (
        <ol className="relative">
          {eventos.map((e, i) => (
            <li key={`${e.quando}-${i}`} className="relative pl-5 pb-4 last:pb-0">
              {i < eventos.length - 1 && (
                <span className="absolute left-[4px] top-3 bottom-0 w-px bg-ink-200 dark:bg-ink-700" aria-hidden />
              )}
              <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-ink-900 ${DOT[e.tom] || DOT.gray}`} />
              <p className="text-sm text-ink-900 dark:text-ink-100">{e.texto}</p>
              <p className="text-2xs text-ink-500">
                {formatarDataHora(e.quando)}
                {e.detalhe ? ` · ${e.detalhe}` : ""}
                {e.usuario ? ` · ${e.usuario}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
