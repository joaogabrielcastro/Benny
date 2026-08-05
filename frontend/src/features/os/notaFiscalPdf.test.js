import { describe, it, expect } from "vitest";
import {
  isPaginaConsultaNfse,
  urlConsultaPublicaNfse,
  resolvePdfUrl,
} from "./notaFiscalPdf";

describe("notaFiscalPdf helpers", () => {
  it("detecta página de consulta NFS-e", () => {
    expect(
      isPaginaConsultaNfse(
        "https://www.nfse.gov.br/consultapublica/?tpc=1&chave=123",
      ),
    ).toBe(true);
    expect(isPaginaConsultaNfse("https://example.com/doc.pdf")).toBe(false);
  });

  it("urlConsultaPublicaNfse usa chave", () => {
    const url = urlConsultaPublicaNfse({
      chave_acesso: "1".repeat(44),
    });
    expect(url).toContain("nfse.gov.br");
    expect(url).toContain("chave=");
  });

  it("resolvePdfUrl prioriza endpoint autenticado", () => {
    const r = resolvePdfUrl({
      id: 10,
      id_provedor: "inv_1",
      status_nf: "autorizada",
      status_provedor: "issued",
    });
    expect(r.auth).toBe(true);
    expect(r.url).toContain("/notas-fiscais/10/pdf");
  });

  it("resolvePdfUrl storage local exige auth", () => {
    const r = resolvePdfUrl({
      pdf_path: "storage/notas/x.pdf",
    });
    expect(r.auth).toBe(true);
    expect(r.url).toContain("/storage/");
  });
});
