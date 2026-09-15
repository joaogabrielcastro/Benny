import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../src/lib/AppError.js";
import { baixarEstoqueProduto } from "../src/services/estoqueMovimentacao.js";

function mockClient(handlers) {
  return {
    query: async (sql, params) => {
      for (const h of handlers) {
        if (h.match(sql, params)) return h.result(sql, params);
      }
      throw new Error(`Query não mockada: ${sql}`);
    },
  };
}

describe("baixarEstoqueProduto — adversariais", () => {
  it("recusa baixa quando estoque insuficiente", async () => {
    const client = mockClient([
      {
        match: (sql) => sql.includes("FOR UPDATE"),
        result: () => ({ rows: [{ id: 10 }] }),
      },
      {
        match: (sql) => sql.includes("quantidade >= $1"),
        result: () => ({ rows: [] }),
      },
      {
        match: (sql) =>
          sql.includes("SELECT id, quantidade FROM produtos"),
        result: () => ({ rows: [{ id: 10, quantidade: 1 }] }),
      },
    ]);

    await assert.rejects(
      () =>
        baixarEstoqueProduto(client, {
          tenantId: 1,
          produtoId: 10,
          quantidade: 5,
          motivo: "teste",
          osId: 99,
        }),
      (err) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /Estoque insuficiente/.test(err.message),
    );
  });

  it("recusa produto de outro tenant (não encontrado no escopo)", async () => {
    const client = mockClient([
      {
        match: (sql) => sql.includes("FOR UPDATE"),
        result: () => ({ rows: [] }),
      },
      {
        match: (sql) => sql.includes("quantidade >= $1"),
        result: () => ({ rows: [] }),
      },
      {
        match: (sql) =>
          sql.includes("SELECT id, quantidade FROM produtos"),
        result: () => ({ rows: [] }),
      },
    ]);

    await assert.rejects(
      () =>
        baixarEstoqueProduto(client, {
          tenantId: 2,
          produtoId: 10,
          quantidade: 1,
          motivo: "teste",
        }),
      (err) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        /não encontrado neste tenant/.test(err.message),
    );
  });

  it("persiste movimentação com os_id e orcamento_id quando sucesso", async () => {
    const inserts = [];
    const client = mockClient([
      {
        match: (sql) => sql.includes("FOR UPDATE"),
        result: () => ({ rows: [{ id: 10 }] }),
      },
      {
        match: (sql) => sql.includes("quantidade >= $1"),
        result: () => ({ rows: [{ id: 10 }] }),
      },
      {
        match: (sql) => sql.includes("INSERT INTO movimentacoes_estoque"),
        result: (_sql, params) => {
          inserts.push(params);
          return { rows: [] };
        },
      },
    ]);

    await baixarEstoqueProduto(client, {
      tenantId: 1,
      produtoId: 10,
      quantidade: 2,
      motivo: "Utilizado na OS",
      osId: 55,
      orcamentoId: 77,
    });

    assert.deepEqual(inserts[0], [10, 2, "Utilizado na OS", 55, 77, 1]);
  });
});
