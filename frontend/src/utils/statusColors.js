/**
 * Sistema único de status da Benny's.
 * Cada status tem um tom semântico; o mesmo tom significa a mesma coisa em
 * todos os módulos (azul = a fazer, âmbar = em curso/atenção, verde = concluído,
 * vermelho = problema, cinza = encerrado sem efeito, violeta = aguardando cliente).
 */

export const TONES = {
  blue: {
    badge: "bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-400/25",
    dot: "bg-brand-500",
    soft: "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
  },
  amber: {
    badge: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-400/25",
    dot: "bg-amber-500",
    soft: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  green: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-400/25",
    dot: "bg-emerald-500",
    soft: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  red: {
    badge: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-400/25",
    dot: "bg-red-500",
    soft: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
  violet: {
    badge: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-400/25",
    dot: "bg-violet-500",
    soft: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
  gray: {
    badge: "bg-ink-100 text-ink-600 ring-ink-500/20 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-400/20",
    dot: "bg-ink-400",
    soft: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
  },
};

/** Tom de cada status, por domínio. */
export const STATUS_TONE = {
  os: {
    Aberta: "blue",
    "Em andamento": "amber",
    Finalizada: "green",
    Cancelada: "gray",
  },
  orcamento: {
    Pendente: "violet",
    Aprovado: "green",
    Reprovado: "gray",
  },
  nf: {
    autorizada: "green",
    processamento: "amber",
    rejeitada: "red",
    erro_autenticacao: "red",
    configuracao_pendente: "amber",
    cancelada: "gray",
    substituida: "gray",
  },
  pagamento: {
    Recebido: "green",
    Pendente: "amber",
    Vencido: "red",
  },
  situacaoPagamento: {
    Quitada: "green",
    Parcial: "amber",
    "Em aberto": "gray",
  },
  conta: {
    Pago: "green",
    Pendente: "amber",
    Vencida: "red",
    Cancelado: "gray",
  },
  agendamento: {
    Agendado: "blue",
    Confirmado: "violet",
    "Em Andamento": "amber",
    "Concluído": "green",
    Cancelado: "gray",
  },
};

/** Rótulos amigáveis para status técnicos (fiscal). */
export const STATUS_LABEL = {
  nf: {
    autorizada: "Autorizada",
    processamento: "Processando",
    rejeitada: "Rejeitada",
    erro_autenticacao: "Erro de autenticação",
    configuracao_pendente: "Configuração pendente",
    cancelada: "Cancelada",
    substituida: "Substituída",
  },
};

export function statusTone(kind, status) {
  return STATUS_TONE[kind]?.[status] || "gray";
}

export function statusLabel(kind, status) {
  return STATUS_LABEL[kind]?.[status] || status || "—";
}

export function statusBadgeClass(kind, status) {
  return `badge-status ${TONES[statusTone(kind, status)].badge}`;
}

/** Compatibilidade com telas antigas. */
export const orcamentoStatusClass = (status) => statusBadgeClass("orcamento", status);
export const osStatusClass = (status) => statusBadgeClass("os", status);

/** Status da conta a pagar considerando vencimento. */
export function statusContaPagar(conta, hoje = new Date()) {
  if (conta?.status === "Pendente" && conta?.data_vencimento) {
    const venc = new Date(String(conta.data_vencimento).slice(0, 10) + "T23:59:59");
    if (venc < hoje) return "Vencida";
  }
  return conta?.status || "Pendente";
}

/** Status do recebimento considerando vencimento. */
export function statusRecebimento(p, hoje = new Date()) {
  if (p?.status === "Pendente" && p?.data_vencimento) {
    const venc = new Date(String(p.data_vencimento).slice(0, 10) + "T23:59:59");
    if (venc < hoje) return "Vencido";
  }
  return p?.status || "Pendente";
}
