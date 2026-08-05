import { describe, it } from "node:test";
import assert from "node:assert/strict";
import backupService from "../src/services/backupService.js";

describe("backupService", () => {
  it("lista tabelas de negócio no fallback JSON", () => {
    const tables = backupService.JSON_BACKUP_TABLES;
    assert.ok(tables.includes("orcamento_produtos"));
    assert.ok(tables.includes("os_produtos"));
    assert.ok(tables.includes("notas_fiscais"));
    assert.ok(tables.includes("contas_pagar"));
    assert.ok(tables.includes("movimentacoes_estoque"));
    assert.ok(tables.length >= 15);
  });
});
