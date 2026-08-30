import archiver from "archiver";
import { PassThrough } from "node:stream";
import { baixarPdf } from "../notasFiscais/notasFiscaisBaixarPdf.js";
import { baixarXmlNfse } from "../nuvemFiscalClient.js";
import { isNuvemFiscalConfigured } from "../../config/nuvemFiscal.js";
import {
  gerarCsvEventos,
  gerarCsvResumo,
  nomeArquivoNota,
  nomeArquivoZip,
} from "./fechamentoMensalUtils.js";

function bufferFromStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function baixarXmlNota(nota, tipo = "emission") {
  if (String(nota.modelo_documento).toUpperCase() !== "NFSE") {
    return { ok: false, mensagem: "XML disponível apenas para NFS-e nesta versão." };
  }
  if (!nota.id_provedor) {
    return { ok: false, mensagem: "Nota sem vínculo na Notaas." };
  }
  return baixarXmlNfse(nota.id_provedor, tipo);
}

export async function exportarPacoteZip(resumo, tenantId) {
  const { periodo, notas, totais, avisos } = resumo;
  const erros = [];
  const notasComDocumento = notas.filter(
    (n) =>
      n.id_provedor &&
      (n.status === "autorizada" || n.status === "cancelada") &&
      String(n.modelo_documento).toUpperCase() === "NFSE",
  );

  const passThrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(passThrough);

  archive.append(JSON.stringify({ periodo, totais, avisos, notas }, null, 2), {
    name: "resumo.json",
  });
  archive.append(gerarCsvResumo(notas), { name: "resumo.csv" });
  archive.append(gerarCsvEventos(notas), { name: "eventos-cancelamento.csv" });

  if (!isNuvemFiscalConfigured()) {
    erros.push("Notaas não configurada — PDFs e XMLs não foram incluídos.");
  } else if (notasComDocumento.length === 0) {
    erros.push("Nenhuma NFS-e autorizada/cancelada com vínculo Notaas neste mês.");
  } else {
    for (const nota of notasComDocumento) {
      const base = nomeArquivoNota(nota, "pdf").replace(/\.pdf$/, "");

      const pdf = await baixarPdf(tenantId, nota.id);
      if (pdf.erro) {
        erros.push(`PDF nota ${nota.id}: ${pdf.erro}`);
      } else {
        archive.append(pdf.buffer, { name: `pdf/${base}.pdf` });
      }

      const xml = await baixarXmlNota(nota, "emission");
      if (xml.ok) {
        archive.append(xml.buffer, { name: `xml/emissao/${base}.xml` });
      } else {
        erros.push(`XML emissão nota ${nota.id}: ${xml.mensagem}`);
      }

      if (nota.status === "cancelada") {
        const xmlCancel = await baixarXmlNota(nota, "cancel");
        if (xmlCancel.ok) {
          archive.append(xmlCancel.buffer, {
            name: `xml/cancelamento/${base}-cancel.xml`,
          });
        } else {
          erros.push(`XML cancelamento nota ${nota.id}: ${xmlCancel.mensagem}`);
        }
      }
    }
  }

  if (erros.length) {
    archive.append(erros.join("\n"), { name: "avisos-exportacao.txt" });
  }

  await archive.finalize();
  const buffer = await bufferFromStream(passThrough);

  return {
    buffer,
    filename: nomeArquivoZip(periodo.ano, periodo.mes),
    avisos: erros,
  };
}
