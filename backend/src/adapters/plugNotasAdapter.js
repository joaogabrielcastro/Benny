import fs from "fs";
import path from "path";
import axios from "axios";

// Adapter for PlugNotas: supports real provider via env/config, falls back to stub.
async function emitirNota(nfData, empresaConfig) {
  const providerUrl = process.env.PLUGNOTAS_URL; // e.g. https://api.plugnotas.com.br
  const apiKey = empresaConfig?.api_key || process.env.PLUGNOTAS_API_KEY;

  if (providerUrl && apiKey) {
    // Attempt real provider call
    try {
      // Map nfData to provider payload - minimal example, adapt as needed per provider API
      const payload = {
        numero_interno: nfData.id,
        cliente: nfData.cliente,
        produtos: nfData.produtos,
        servicos: nfData.servicos,
        valores: {
          valor_produtos: nfData.valor_produtos,
          valor_servicos: nfData.valor_servicos,
          valor_total: nfData.valor_total,
        },
      };

      const res = await axios.post(`${providerUrl}/nfe`, payload, {
        headers: {
          Authorization: `Api-Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      });

      const body = res.data;

      // Provider may return base64 pdf/xml or URLs — try to normalize
      const pdfBase64 = body.pdfBase64 || body.pdf_base64 || null;
      const xmlBase64 = body.xmlBase64 || body.xml_base64 || null;
      const numero = body.numero || body.id || String(Math.floor(Math.random() * 900000) + 100000);

      // Persist artifacts if provided
      try {
        const storageDir = path.resolve(process.cwd(), "backend", "storage");
        if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
        if (pdfBase64) fs.writeFileSync(path.join(storageDir, `nf_${nfData.id}.pdf`), Buffer.from(pdfBase64, "base64"));
        if (xmlBase64) fs.writeFileSync(path.join(storageDir, `nf_${nfData.id}.xml`), Buffer.from(xmlBase64, "base64"));
      } catch (e) {
        // ignore storage errors
      }

      return {
        numero,
        status: body.status || "emitida",
        pdfBase64,
        xmlBase64,
        providerResponse: body,
      };
    } catch (err) {
      throw new Error(`PlugNotas provider error: ${err.message}`);
    }
  }

  // Fallback stub behavior
  await new Promise((r) => setTimeout(r, 300));
  const numero = String(Math.floor(Math.random() * 900000) + 100000);
  const pdfContent = `PDF - NF ${numero} - Emitida para OS ${nfData.os_id}`;
  const xmlContent = `<nfe><numero>${numero}</numero><os>${nfData.os_id}</os></nfe>`;

  const pdfBase64 = Buffer.from(pdfContent, "utf8").toString("base64");
  const xmlBase64 = Buffer.from(xmlContent, "utf8").toString("base64");

  try {
    const storageDir = path.resolve(process.cwd(), "backend", "storage");
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    fs.writeFileSync(path.join(storageDir, `nf_${numero}.pdf`), Buffer.from(pdfBase64, "base64"));
    fs.writeFileSync(path.join(storageDir, `nf_${numero}.xml`), Buffer.from(xmlBase64, "base64"));
  } catch (e) {
    // ignore
  }

  return {
    numero,
    status: "emitida",
    pdfBase64,
    xmlBase64,
    providerResponse: { stub: true },
  };
}

export default { emitirNota };
