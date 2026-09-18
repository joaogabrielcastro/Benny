import { createRequire } from "node:module";
import { PassThrough } from "node:stream";
import { baixarPdf } from "../notasFiscais/notasFiscaisBaixarPdf.js";
import { baixarXmlNfe, baixarXmlNfse } from "../nuvemFiscalClient.js";
import { isNuvemFiscalConfigured } from "../../config/nuvemFiscal.js";
import {
  gerarCsvEventos,
  gerarCsvResumo,
  nomeArquivoNota,
  nomeArquivoZip,
} from "./fechamentoMensalUtils.js";

// archiver é CJS — default import ESM falha no Node 22
const require = createRequire(import.meta.url);
const archiver = require("archiver");

function bufferFromStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function baixarXmlNota(nota, tipo = "emission") {
  if (!nota.id_provedor) {
    return { ok: false, mensagem: "Nota sem vínculo na Notaas." };
  }
  const modelo = String(nota.modelo_documento).toUpperCase();
  if (modelo === "NFE") {
    return baixarXmlNfe(nota.id_provedor, tipo);
  }
  if (modelo === "NFSE") {
    return baixarXmlNfse(nota.id_provedor, tipo);
  }
  return { ok: false, mensagem: "Modelo de documento sem XML nesta versão." };
}

export async function exportarPacoteZip(resumo, tenantId) {
  const { periodo, notas, totais, avisos } = resumo;
  const erros = [];
  const notasComDocumento = notas.filter((n) => {
    const modelo = String(n.modelo_documento).toUpperCase();
    return (
      n.id_provedor &&
      (n.status === "autorizada" || n.status === "cancelada") &&
      (modelo === "NFSE" || modelo === "NFE")
    );
  });

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
    erros.push("Nenhuma NFS-e/NF-e autorizada/cancelada com vínculo Notaas neste mês.");
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
