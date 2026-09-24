import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { casarPecas, normalizarTexto } from "../src/services/orcamentos/sugestaoMatcher.js";
import { expandirSinonimos } from "../src/services/orcamentos/sinonimosAutomotivos.js";
import { buscarCandidatos, LIMITE_CANDIDATOS } from "../src/services/orcamentos/catalogoCandidatos.js";

describe("matcher avançado", () => {
  it("trata acento e hífen como o mesmo texto", () => {
    assert.equal(normalizarTexto("Fluído"), normalizarTexto("Fluido"));
    assert.equal(normalizarTexto("G-13"), normalizarTexto("G13"));
    assert.equal(normalizarTexto("2.0 TSI"), "2.0 tsi");
  });

  it("sinônimo de arrefecimento encontra o aditivo G13", () => {
    const termos = expandirSinonimos(["líquido de arrefecimento", "G13", "aditivo radiador"]);
    assert.ok(termos.some((t) => t.includes("aditivo")));
    const [item] = casarPecas(
      [{ descricao: "líquido de arrefecimento", termos_busca: ["G13", "aditivo radiador"] }],
      [{ id: 1, codigo: "P-1", nome: "Aditivo G13 1L", descricao: "Aditivo para radiador", valor_venda: 40, quantidade: 3 }],
    );
    assert.equal(item.match, "MATCH_PROVAVEL");
    assert.equal(item.produto.id, 1);
    assert.equal(item.produto.valor_unitario, 40);
  });

  it("código igual é MATCH_EXATO", () => {
    const [item] = casarPecas(
      [{ descricao: "peça", termos_busca: ["P-0042"] }],
      [{ id: 7, codigo: "P-0042", nome: "Filtro qualquer", valor_venda: 15, quantidade: 2 }],
    );
    assert.equal(item.match, "MATCH_EXATO");
    assert.equal(item.produto.id, 7);
  });

  it("não escolhe sozinho entre pastilhas equivalentes", () => {
    const [item] = casarPecas(
      [{ descricao: "Pastilha dianteira Jetta", termos_busca: ["pastilha dianteira"] }],
      [
        { id: 1, codigo: "A", nome: "Pastilha Dianteira Jetta Bosch", valor_venda: 100, quantidade: 2 },
        { id: 2, codigo: "B", nome: "Pastilha Dianteira Jetta TRW", valor_venda: 110, quantidade: 1 },
      ],
    );
    assert.equal(item.match, "MATCH_PROVAVEL");
    assert.equal(item.ambiguo, true);
    assert.equal(item.produto, undefined);
    assert.equal(item.candidatos.length, 2);
  });

  it("óleo 5W30 não casa com óleo 10W40", () => {
    const [item] = casarPecas(
      [{ descricao: "óleo 5W30", termos_busca: ["5W30"] }],
      [{ id: 3, codigo: "OL", nome: "Óleo 10W40", descricao: "lubrificante", valor_venda: 30, quantidade: 4 }],
    );
    assert.equal(item.match, "NAO_ENCONTRADO");
    assert.equal(item.produto, undefined);
  });

  it("motor no nome só altera o ranking, sem declarar compatibilidade", () => {
    const [item] = casarPecas(
      [{ descricao: "Filtro Jetta", termos_busca: ["filtro jetta"] }],
      [
        { id: 2, codigo: "F14", nome: "Filtro Jetta 1.4 TSI", valor_venda: 20, quantidade: 1 },
        { id: 1, codigo: "F20", nome: "Filtro Jetta 2.0 TSI", valor_venda: 25, quantidade: 1 },
      ],
      { marca: "Volkswagen", modelo: "Jetta", motor: "2.0 TSI" },
    );
    assert.equal(item.candidatos[0].produto.nome, "Filtro Jetta 2.0 TSI");
    assert.equal(JSON.stringify(item).includes("compatível"), false);
  });

  it("busca do catálogo filtra tenant e limita, sem carregar a tabela inteira", async () => {
    let visto = null;
    await buscarCandidatos(async (sql, params) => {
      visto = { sql, params };
      assert.match(sql, /tenant_id = \$1/);
      assert.match(sql, /LIMIT 20/);
      assert.equal(params[0], 9);
      assert.equal(sql.includes("SELECT *"), false);
      return { rows: [] };
    }, 9, ["pastilha"]);
    assert.equal(LIMITE_CANDIDATOS, 20);
    assert.ok(visto.params.length < 5000);
  });
});
