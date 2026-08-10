import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Simula o fluxo SQL da exclusão em cascata sem banco real:
 * a ordem deve quebrar o ciclo OS ↔ notas_fiscais e limpar filhos antes do cliente.
 */
function createFakeClient(queries) {
  const executed = [];
  return {
    executed,
    query: async (sql, params = []) => {
      executed.push({ sql: String(sql).replace(/\s+/g, " ").trim(), params });
      const key = Object.keys(queries).find((k) => sql.includes(k));
      if (!key) return { rows: [] };
      const value = queries[key];
      return typeof value === "function" ? value(params) : value;
    },
  };
}

describe("exclusão em cascata de cliente (ordem das operações)", () => {
  it("remove OS/notas, orçamentos, agenda, veículos e por fim o cliente", async () => {
    const client = createFakeClient({
      "SELECT id, nome FROM clientes": {
        rows: [{ id: 7, nome: "Cliente Teste" }],
      },
      "FROM ordens_servico WHERE cliente_id": { rows: [{ id: 11 }] },
      "FROM orcamentos WHERE cliente_id": { rows: [{ id: 22 }] },
      "FROM agendamentos WHERE cliente_id": { rows: [{ id: 33 }] },
      "FROM veiculos WHERE cliente_id": { rows: [{ id: 44 }] },
      "FROM notas_fiscais nf": { rows: [{ total: 1 }] },
      "FROM movimentacoes_estoque WHERE": { rows: [] },
      "DELETE FROM clientes": {
        rows: [{ id: 7, nome: "Cliente Teste" }],
      },
    });

    // Replica a ordem crítica do serviço (sem importar pool).
    await client.query("BEGIN");
    const osRows = (
      await client.query(
        "SELECT id FROM ordens_servico WHERE cliente_id = $1",
        [7],
      )
    ).rows;
    const orcRows = (
      await client.query("SELECT id FROM orcamentos WHERE cliente_id = $1", [7])
    ).rows;
    const agRows = (
      await client.query(
        "SELECT id FROM agendamentos WHERE cliente_id = $1",
        [7],
      )
    ).rows;

    for (const os of osRows) {
      await client.query(
        "SELECT * FROM movimentacoes_estoque WHERE os_id = $1",
        [os.id],
      );
      await client.query(
        "UPDATE ordens_servico SET nf_id = NULL, nf_nfe_id = NULL WHERE id = $1",
        [os.id],
      );
      await client.query(
        "DELETE FROM notas_fiscais WHERE ordem_servico_id = $1",
        [os.id],
      );
      await client.query("DELETE FROM ordens_servico WHERE id = $1", [os.id]);
    }
    for (const orc of orcRows) {
      await client.query(
        "SELECT * FROM movimentacoes_estoque WHERE orcamento_id = $1",
        [orc.id],
      );
      await client.query("DELETE FROM orcamentos WHERE id = $1", [orc.id]);
    }
    await client.query(
      "DELETE FROM lembretes WHERE tipo = 'agendamento' AND referencia_id = ANY($1::int[])",
      [agRows.map((a) => a.id)],
    );
    await client.query("DELETE FROM agendamentos WHERE cliente_id = $1", [7]);
    await client.query("DELETE FROM veiculos WHERE cliente_id = $1", [7]);
    await client.query("DELETE FROM clientes WHERE id = $1 RETURNING id", [7]);
    await client.query("COMMIT");

    const sqls = client.executed.map((e) => e.sql);
    const idxNullNf = sqls.findIndex((s) => s.includes("nf_id = NULL"));
    const idxDelNf = sqls.findIndex((s) =>
      s.includes("DELETE FROM notas_fiscais"),
    );
    const idxDelOs = sqls.findIndex((s) =>
      s.includes("DELETE FROM ordens_servico"),
    );
    const idxDelOrc = sqls.findIndex((s) => s.includes("DELETE FROM orcamentos"));
    const idxDelCli = sqls.findIndex((s) => s.includes("DELETE FROM clientes"));

    assert.ok(idxNullNf < idxDelNf);
    assert.ok(idxDelNf < idxDelOs);
    assert.ok(idxDelOs < idxDelOrc);
    assert.ok(idxDelOrc < idxDelCli);
  });
});
