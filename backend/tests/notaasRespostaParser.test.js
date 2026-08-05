import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapStatusApiNuvemParaInterno,
  camposFromRespostaNuvem,
} from "../src/services/notasFiscais/nuvemRespostaParser.js";

describe("nuvemRespostaParser — Notaas statuses", () => {
  it("mapeia issued → autorizada", () => {
    assert.equal(mapStatusApiNuvemParaInterno("issued"), "autorizada");
  });

  it("mapeia queued/processing → processamento", () => {
    assert.equal(mapStatusApiNuvemParaInterno("queued"), "processamento");
    assert.equal(mapStatusApiNuvemParaInterno("processing"), "processamento");
  });

  it("mapeia error → rejeitada e cancelled → cancelada", () => {
    assert.equal(mapStatusApiNuvemParaInterno("error"), "rejeitada");
    assert.equal(mapStatusApiNuvemParaInterno("cancelled"), "cancelada");
  });

  it("extrai invoiceId, chNFSe, numero e pdfUrl da resposta issued", () => {
    const campos = camposFromRespostaNuvem(
      {
        status: "issued",
        invoiceId: "inv_abc123",
        chNFSe: "4321000001234",
        numeroNfe: "00001",
        pdfUrl: "https://cdn.example/nfse.pdf",
        issuedAt: "2026-03-12T19:00:00.000Z",
      },
      100,
      "NFSE",
    );
    assert.equal(campos.status, "autorizada");
    assert.equal(campos.idProvedor, "inv_abc123");
    assert.equal(campos.chaveAcesso, "4321000001234");
    assert.equal(campos.numeroNf, "00001");
    assert.equal(campos.linkPdf, "https://cdn.example/nfse.pdf");
    assert.ok(campos.dataEmissao instanceof Date);
  });

  it("trata resposta 202 queued com invoiceId", () => {
    const campos = camposFromRespostaNuvem(
      {
        queued: true,
        invoiceId: "inv_q1",
        status: "queued",
        pollUrl: "/api/v1/invoices/inv_q1/status",
      },
      50,
      "NFSE",
    );
    assert.equal(campos.status, "processamento");
    assert.equal(campos.idProvedor, "inv_q1");
  });

  it("extrai número curto quando Notaas manda chave no campo numero", () => {
    const campos = camposFromRespostaNuvem(
      {
        status: "issued",
        invoiceId: "inv_abc",
        numeroNfe: "NFS41058052255961553000100000000000001426083529461110",
        issuedAt: "2026-03-12T19:00:00.000Z",
      },
      100,
      "NFSE",
    );
    assert.equal(campos.status, "autorizada");
    assert.equal(campos.numeroNf, "14");
    assert.match(campos.chaveAcesso, /^NFS/);
  });
});
