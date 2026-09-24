import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { respostaAssistenteIaSchema } from "../src/schemas/orcamentoAssistenteSchemas.js";
import {
  casarPecas,
  casarServicos,
  classificarContraCadastro,
  estadoEstoque,
} from "../src/services/orcamentos/sugestaoMatcher.js";
import { createOrcamentosAssistenteService } from "../src/services/orcamentos/orcamentosAssistenteService.js";
import { AppError } from "../src/lib/AppError.js";

const produtoG13 = {
  id: 45,
  codigo: "P-0045",
  nome: "Aditivo G13 1L",
  descricao: "Aditivo para radiador",
  valor_venda: 42,
  quantidade: 8,
};

function iaBase(extra = {}) {
  return {
    data: {
      titulo: "Arrefecimento",
      resumo: "Sugestão para revisão.",
      diagnosticos_sugeridos: ["Verificar vazamentos"],
      servicos_sugeridos: [],
      pecas_sugeridas: [],
      itens_condicionais: [],
      perguntas: [],
      ...extra,
    },
    usage: { input_tokens: 10, output_tokens: 20 },
    provider: "mock",
    model: "mock",
  };
}

function queryContextoOk(tenantId, extras = []) {
  const chamadas = [];
  const query = async (sql, params) => {
    chamadas.push({ sql, params });
    const texto = String(sql).toUpperCase();
    if (texto.startsWith("INSERT") || texto.startsWith("UPDATE") || texto.startsWith("DELETE")) {
      throw new Error("gravação inesperada");
    }
    if (texto.includes("FROM CLIENTES")) {
      const [id, tenant] = params;
      if (id === 1 && tenant === tenantId) return { rows: [{ id: 1 }] };
      return { rows: [] };
    }
    if (texto.includes("FROM VEICULOS")) {
      const [id, clienteId, tenant] = params;
      if (id === 10 && clienteId === 1 && tenant === tenantId) {
        return { rows: [{ id: 10, marca: "Volkswagen", modelo: "Jetta", ano: "2016", cor: "prata" }] };
      }
      return { rows: [] };
    }
    if (texto.includes("FROM PRODUTOS")) {
      assert.equal(params[0], tenantId);
      return { rows: extras.filter((r) => r.tabela === "produtos").map((r) => r.row) };
    }
    if (texto.includes("FROM SERVICOS") && !texto.includes("FROM OS_SERVICOS")) {
      assert.equal(params[0], tenantId);
      return { rows: extras.filter((r) => r.tabela === "servicos").map((r) => r.row) };
    }
    if (texto.includes("FROM ORDENS_SERVICO")) return { rows: [] };
    if (texto.includes("FROM OS_PRODUTOS")) return { rows: [] };
    if (texto.includes("FROM OS_SERVICOS")) return { rows: [] };
    throw new Error(`SQL inesperado: ${sql}`);
  };
  return { query, chamadas };
}

describe("sugestaoMatcher", () => {
  it("MATCH_EXATO usa nome e valor_venda do banco", () => {
    const [item] = casarPecas(
      [{ descricao: "Aditivo G13 1L", termos_busca: ["Aditivo G13 1L"], quantidade: 2, preco: 1, produto_id: 999999 }],
      [produtoG13],
    );
    assert.equal(item.match, "MATCH_EXATO");
    assert.equal(item.produto.id, 45);
    assert.equal(item.produto.valor_unitario, 42);
    assert.equal(item.produto.estoque, 8);
    assert.equal(item.quantidade_sugerida, 2);
    assert.equal(item.estoque_status, "DISPONIVEL");
    assert.equal(item.preco, undefined);
    assert.equal(item.produto_id, undefined);
  });

  it("MATCH_PROVAVEL quando o termo G13 cabe em Aditivo G13", () => {
    const [item] = casarPecas(
      [{
        descricao: "líquido de arrefecimento",
        termos_busca: ["G13"],
        quantidade: 2,
        necessidade: "provavel",
      }],
      [produtoG13],
    );
    assert.equal(item.match, "MATCH_PROVAVEL");
    assert.equal(item.produto.valor_unitario, 42);
    assert.equal(item.produto.id, 45);
  });

  it("NAO_ENCONTRADO não inventa preço nem id", () => {
    const [item] = casarPecas(
      [{ descricao: "Radiador XYZ inexistente", termos_busca: ["xyz-inexistente"], quantidade: 1 }],
      [produtoG13],
    );
    assert.equal(item.match, "NAO_ENCONTRADO");
    assert.equal(item.produto, undefined);
    assert.equal(item.produto_id, undefined);
  });

  it("ignora produto_id inventado e casa pelo texto", () => {
    const match = classificarContraCadastro(["Aditivo G13 1L"], { ...produtoG13, id: 45 });
    assert.equal(match, "MATCH_EXATO");
    const [item] = casarPecas(
      [{ descricao: "Outra peça", termos_busca: ["Aditivo G13 1L"], produto_id: 999999, quantidade: 1 }],
      [produtoG13],
    );
    assert.equal(item.produto.id, 45);
    assert.notEqual(item.produto.id, 999999);
  });

  it("classifica estoque", () => {
    assert.equal(estadoEstoque(0, 1), "SEM_ESTOQUE");
    assert.equal(estadoEstoque(1, 2), "ESTOQUE_INSUFICIENTE");
    assert.equal(estadoEstoque(3, 2), "DISPONIVEL");
  });

  it("serviço provável copia valor_unitario do catálogo", () => {
    const [item] = casarServicos(
      [{ descricao: "inspeção do arrefecimento", termos_busca: ["arrefecimento"], quantidade_sugerida: 1 }],
      [{ id: 9, codigo: "S-0014", nome: "Manutenção do sistema de arrefecimento", descricao: "", valor_unitario: 180 }],
    );
    assert.equal(item.match, "MATCH_PROVAVEL");
    assert.equal(item.servico.codigo, "S-0014");
    assert.equal(item.servico.valor_unitario, 180);
    assert.equal(item.servico.id, undefined);
  });
});

describe("respostaAssistenteIaSchema", () => {
  it("descarta preço e produto_id vindos do modelo", () => {
    const parsed = respostaAssistenteIaSchema.parse({
      titulo: "Teste",
      pecas_sugeridas: [{
        descricao: "Aditivo",
        termos_busca: ["G13"],
        quantidade: 1,
        preco: 1,
        produto_id: 999999,
        valor_unitario: 1,
      }],
    });
    assert.equal(parsed.pecas_sugeridas[0].preco, undefined);
    assert.equal(parsed.pecas_sugeridas[0].produto_id, undefined);
    assert.equal(parsed.pecas_sugeridas[0].descricao, "Aditivo");
  });
});

describe("orcamentosAssistenteService", () => {
  it("não chama a IA se o veículo é de outro tenant", async () => {
    let chamadasIa = 0;
    const { query } = queryContextoOk(1);
    const service = createOrcamentosAssistenteService({
      query,
      generateStructured: async () => {
        chamadasIa += 1;
        return iaBase();
      },
      log: { info() {}, error() {}, warn() {} },
    });

    await assert.rejects(
      () => service.sugerir({
        tenantId: 1,
        userId: 7,
        body: {
          cliente_id: 1,
          veiculo_id: 99,
          descricao: "esquentando e baixando água",
          respostas: [],
        },
      }),
      (err) => err instanceof AppError && err.statusCode === 404,
    );
    assert.equal(chamadasIa, 0);
  });

  it("candidatos usam somente o tenant da requisição", async () => {
    const { query, chamadas } = queryContextoOk(1, [
      { tabela: "produtos", row: produtoG13 },
    ]);
    const service = createOrcamentosAssistenteService({
      query,
      generateStructured: async () => iaBase({
        pecas_sugeridas: [{
          descricao: "Aditivo G13 1L",
          termos_busca: ["Aditivo G13 1L"],
          quantidade: 1,
          confianca: "alta",
          necessidade: "provavel",
        }],
      }),
      log: { info() {}, error() {}, warn() {} },
    });

    const resposta = await service.sugerir({
      tenantId: 1,
      userId: 3,
      body: {
        cliente_id: 1,
        veiculo_id: 10,
        descricao: "Jetta esquentando e baixando agua do radiador",
        respostas: [],
      },
    });

    const catalogo = chamadas.filter((c) => /FROM produtos/i.test(c.sql));
    assert.ok(catalogo.length >= 1);
    for (const c of catalogo) {
      assert.match(c.sql, /tenant_id = \$1/);
      assert.equal(c.params[0], 1);
    }
    assert.equal(resposta.pecas[0].produto.valor_unitario, 42);
    assert.equal(resposta.pecas[0].produto.id, 45);
  });

  it("preço inventado pela IA não substitui valor_venda", async () => {
    const { query } = queryContextoOk(1, [{ tabela: "produtos", row: produtoG13 }]);
    const service = createOrcamentosAssistenteService({
      query,
      generateStructured: async () => iaBase({
        pecas_sugeridas: [{
          descricao: "Aditivo",
          termos_busca: ["G13"],
          quantidade: 2,
          preco: 1,
          produto_id: 999999,
          necessidade: "provavel",
          confianca: "alta",
        }],
      }),
      log: { info() {}, error() {}, warn() {} },
    });
    const resposta = await service.sugerir({
      tenantId: 1,
      userId: 1,
      body: { cliente_id: 1, veiculo_id: 10, descricao: "baixando agua no radiador", respostas: [] },
    });
    assert.equal(resposta.pecas[0].match, "MATCH_PROVAVEL");
    assert.equal(resposta.pecas[0].produto.valor_unitario, 42);
    assert.equal(resposta.pecas[0].produto.id, 45);
  });

  it("não grava orçamento, OS, produto, serviço nem estoque", async () => {
    const sqls = [];
    const { query } = queryContextoOk(1, [{ tabela: "produtos", row: produtoG13 }]);
    const service = createOrcamentosAssistenteService({
      query: async (sql, params) => {
        sqls.push(sql);
        return query(sql, params);
      },
      generateStructured: async () => iaBase({
        pecas_sugeridas: [{
          descricao: "Radiador XYZ inexistente",
          termos_busca: ["xyz-inexistente"],
          quantidade: 1,
        }],
      }),
      log: { info() {}, error() {}, warn() {} },
    });
    const resposta = await service.sugerir({
      tenantId: 1,
      userId: 1,
      body: { cliente_id: 1, veiculo_id: 10, descricao: "poça de agua embaixo do carro", respostas: [] },
    });
    assert.equal(resposta.pecas[0].match, "NAO_ENCONTRADO");
    for (const sql of sqls) {
      assert.doesNotMatch(sql, /^\s*(INSERT|UPDATE|DELETE|ALTER)/i);
    }
  });
});
