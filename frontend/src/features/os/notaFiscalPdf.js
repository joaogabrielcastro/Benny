import toast from "react-hot-toast";
import api from "../../services/api";

/** Página HTML de consulta (não é PDF) — fetch no browser falha por CORS. */
export function isPaginaConsultaNfse(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return (
      /nfse\.gov\.br$/i.test(u.hostname) &&
      /consulta/i.test(`${u.pathname}${u.search}`)
    );
  } catch {
    return /nfse\.gov\.br.*consulta/i.test(url);
  }
}

/** Abre consulta pública no portal nacional (nova aba). */
export function urlConsultaPublicaNfse(nota) {
  const chave = String(nota?.chave_acesso || "").replace(/\D/g, "");
  if (chave.length >= 44) {
    return `https://www.nfse.gov.br/consultapublica/?tpc=1&chave=${chave}`;
  }
  const raw = nota?.link_pdf || nota?.pdf_path || "";
  if (isPaginaConsultaNfse(raw)) return raw;
  return null;
}

export function abrirConsultaPublicaNfse(nota) {
  const url = urlConsultaPublicaNfse(nota);
  if (!url) {
    toast.error("Chave de acesso da NFS-e indisponível para consulta.");
    return;
  }
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) toast.error("Permita pop-ups para abrir o portal da NFS-e.");
}

/** URL do DANFE/DANFSe oficial (Notaas ou link salvo). */
export function resolvePdfUrl(nota) {
  if (!nota) return null;

  const prov = String(nota.status_provedor || "").toLowerCase();
  const provOk = !/rejeit|negad|deneg|erro/.test(prov);

  if (nota.id && nota.id_provedor && nota.status_nf === "autorizada" && provOk) {
    return { url: `/notas-fiscais/${nota.id}/pdf`, auth: true };
  }

  const raw = nota.link_pdf || nota.pdf_path;
  if (raw && /^https?:\/\//i.test(raw)) {
    if (isPaginaConsultaNfse(raw)) return null;
    return { url: raw, auth: false };
  }

  if (raw) {
    return {
      url: `/storage/${raw.replace(/^storage\//, "")}`,
      auth: true,
    };
  }

  return null;
}

async function fetchPdfBlob({ url, auth }) {
  if (auth) {
    const { data } = await api.get(url, { responseType: "blob" });
    return new Blob([data], { type: "application/pdf" });
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao baixar o PDF da nota.");
  return res.blob();
}

async function parseApiError(err) {
  let msg = err.response?.data?.error;
  if (err.response?.data instanceof Blob) {
    try {
      const text = await err.response.data.text();
      try {
        const parsed = JSON.parse(text);
        return parsed.error || parsed.message;
      } catch {
        return null;
      }
    } catch {
      /* ignore */
    }
  }
  return msg;
}

export async function abrirDanfePdf(opts, { imprimir = false } = {}) {
  let blobUrl;
  try {
    const blob = await fetchPdfBlob(opts);
    if (blob.type && !blob.type.includes("pdf")) {
      const head = await blob.slice(0, 4).text();
      if (!head.startsWith("%PDF")) {
        throw new Error("Resposta não é um PDF válido.");
      }
    }
    blobUrl = URL.createObjectURL(blob);

    if (imprimir) {
      await imprimirBlobPdf(blobUrl);
      toast.success("DANFE enviado para impressão.");
      return;
    }

    const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      toast.error("Permita pop-ups para abrir o DANFE.");
      return;
    }
    toast("Use Ctrl+P na aba do PDF para imprimir.", { icon: "ℹ️" });
  } catch (err) {
    const parsed = await parseApiError(err);
    toast.error(
      parsed ||
        err.message ||
        "PDF indisponível — nota pode estar rejeitada na SEFAZ. Atualize o status e reemita se necessário.",
    );
    throw err;
  } finally {
    if (blobUrl) {
      setTimeout(() => URL.revokeObjectURL(blobUrl), imprimir ? 5_000 : 120_000);
    }
  }
}

function imprimirBlobPdf(blobUrl) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute(
      "style",
      "position:fixed;right:0;bottom:0;width:0;height:0;border:none;",
    );
    iframe.src = blobUrl;

    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve();
        } catch (e) {
          cleanup();
          reject(e);
        }
        setTimeout(cleanup, 2_000);
      }, 300);
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível carregar o PDF para impressão."));
    };

    document.body.appendChild(iframe);
  });
}

export async function baixarDanfePdf(opts, filename = "nota-fiscal") {
  try {
    const blob = await fetchPdfBlob(opts);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${filename.replace(/\s+/g, "_")}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5_000);
    toast.success("PDF baixado.");
  } catch (err) {
    const parsed = await parseApiError(err);
    toast.error(parsed || err.message || "Falha ao baixar o PDF.");
    throw err;
  }
}
