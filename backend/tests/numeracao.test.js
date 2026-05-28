import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatarNumeroOrcamento,
  formatarNumeroOS,
  proximoNumeroOrcamento,
  proximoNumeroOS,
} from "../src/domain/numeracao.js";

describe("numeracao", () => {
  it("formata ORC e OS com padding", () => {
    assert.equal(formatarNumeroOrcamento(1), "ORC-0001");
    assert.equal(formatarNumeroOrcamento(123), "ORC-0123");
    assert.equal(formatarNumeroOS(9), "OS-0009");
    assert.equal(formatarNumeroOS(10000), "OS-10000");
  });

  it("proximoNumero usa nextval da sequence", async () => {
    const client = {
      async query(sql) {
        if (sql.includes("seq_orcamento_numero")) {
          return { rows: [{ n: "7" }] };
        }
        if (sql.includes("seq_os_numero")) {
          return { rows: [{ n: "3" }] };
        }
        throw new Error(`sql inesperado: ${sql}`);
      },
    };
    assert.equal(await proximoNumeroOrcamento(client), "ORC-0007");
    assert.equal(await proximoNumeroOS(client), "OS-0003");
  });
});
