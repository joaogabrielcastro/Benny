export function rotuloFonteTributo(fonte) {
  if (fonte === "nuvem") return " · Nuvem Fiscal";
  if (fonte === "estimativa") return " · estimativa";
  return "";
}

export function formatarAliquota(p) {
  if (p == null || p === "") return "";
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export function feedbackNotaFiscal(toast, message, nf) {
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
    toast.error(message || "Falha na nota fiscal na Nuvem Fiscal.");
  } else if (st === "processamento") {
    toast(message || "Nota em processamento. Aguarde ou atualize o status.", {
      icon: "⏳",
      duration: 6000,
    });
  } else {
    toast(message || "Registro de NF atualizado.", { duration: 5000 });
  }
}
