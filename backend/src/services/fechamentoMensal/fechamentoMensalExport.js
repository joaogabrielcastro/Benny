import { createRequire } from "node:module";
import { PassThrough } from "node:stream";
import { baixarPdf } from "../notasFiscais/notasFiscaisBaixarPdf.js";
import { resolveFiscalProvider } from "../fiscal/providers/index.js";
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

async function baixarXmlNota(nota, tenantId, tipo = "emission") {
  const provider = await resolveFiscalProvider({
    modeloDocumento: nota.modelo_documento,
    provedor: nota.provedor,
    tenantId,
  });
  if (!nota.id_provedor) {
    return { ok: false, mensagem: `Nota sem vínculo na ${provider.rotulo}.` };
  }
  if (!provider.isConfigured()) {
    return { ok: false, mensagem: provider.mensagemNaoConfigurado() };
  }
  return provider.baixarXml(nota.id_provedor, tipo);
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

  if (notasComDocumento.length === 0) {
    erros.push("Nenhuma NFS-e/NF-e autorizada/cancelada com vínculo no provedor neste mês.");
  } else {
    for (const nota of notasComDocumento) {
      const base = nomeArquivoNota(nota, "pdf").replace(/\.pdf$/, "");

      const pdf = await baixarPdf(tenantId, nota.id);
      if (pdf.erro) {
        erros.push(`PDF nota ${nota.id}: ${pdf.erro}`);
      } else {
        archive.append(pdf.buffer, { name: `pdf/${base}.pdf` });
      }

      const xml = await baixarXmlNota(nota, tenantId, "emission");
      if (xml.ok) {
        archive.append(xml.buffer, { name: `xml/emissao/${base}.xml` });
      } else {
        erros.push(`XML emissão nota ${nota.id}: ${xml.mensagem}`);
      }

      if (nota.status === "cancelada") {
        const xmlCancel = await baixarXmlNota(nota, tenantId, "cancel");
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
