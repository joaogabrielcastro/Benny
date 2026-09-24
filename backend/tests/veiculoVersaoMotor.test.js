import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createVeiculoSchema, updateVeiculoSchema } from "../src/schemas/veiculoSchemas.js";
import veiculosService from "../src/services/veiculosService.js";
import { carregarContexto } from "../src/services/orcamentos/contextoOrcamento.js";
import {
  avaliarIdentidade,
  buscarCasosSemelhantes,
} from "../src/services/orcamentos/casosSemelhantes.js";

const migration = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations/020_veiculo_versao_motor_combustivel.sql"),
  "utf8",
);

describe("cadastro veículo versão motor combustível", () => {
  it("migration só adiciona colunas nullable e não preenche veículos antigos", () => {
    assert.match(migration, /versao VARCHAR\(80\)/);
    assert.match(migration, /motor VARCHAR\(80\)/);
    assert.match(migration, /combustivel VARCHAR\(40\)/);
    assert.doesNotMatch(migration, /UPDATE\s+veiculos/i);
    assert.doesNotMatch(migration, /Não informado/);
  });

  it("aceita veículo antigo sem os campos novos", () => {
    const parsed = createVeiculoSchema.parse({
      cliente_id: 1,
      modelo: "Jetta",
      marca: "Volkswagen",
      placa: "ABC1D23",
      ano: 2016,
    });
    assert.equal(parsed.versao, null);
    assert.equal(parsed.motor, null);
    assert.equal(parsed.combustivel, null);
  });

  it("persiste Comfortline, 2.0 TSI e Gasolina com espaços normalizados", async () => {
    const dados = createVeiculoSchema.parse({
      cliente_id: 4,
      modelo: "Jetta",
      marca: "Volkswagen",
      placa: "ABC1D23",
      ano: 2016,
      versao: " Comfortline ",
      motor: "2.0   TSI",
      combustivel: "Gasolina",
    });
    let insert = null;
    const row = await veiculosService.criar(7, dados, {
      query: async (sql, params) => {
        insert = { sql, params };
        return { rows: [{ id: 9, versao: params[7], motor: params[8], combustivel: params[9], tenant_id: params[10] }] };
      },
    });
    assert.match(insert.sql, /INSERT INTO veiculos/);
    assert.equal(insert.params[7], "Comfortline");
    assert.equal(insert.params[8], "2.0 TSI");
    assert.equal(insert.params[9], "Gasolina");
    assert.equal(insert.params[10], 7);
    assert.equal(row.motor, "2.0 TSI");
  });

  it("atualiza motor no tenant e recusa veículo de outro tenant", async () => {
    const dados = updateVeiculoSchema.parse({ motor: "2.0 TSI", versao: "Comfortline", combustivel: "Gasolina" });
    let update = null;
    const salvo = await veiculosService.atualizar(3, 11, dados, {
      query: async (sql, params) => {
        if (sql.includes("SELECT")) {
          return { rows: [{ id: 11, tenant_id: 3, modelo: "Jetta", marca: "Volkswagen", versao: null, motor: null, combustivel: null }] };
        }
        update = params;
        return { rows: [{ id: 11, tenant_id: params[10], motor: params[7] }] };
      },
    });
    assert.equal(update[7], "2.0 TSI");
    assert.equal(update[6], "Comfortline");
    assert.equal(update[8], "Gasolina");
    assert.equal(update[10], 3);
    assert.equal(salvo.motor, "2.0 TSI");

    const outro = await veiculosService.atualizar(9, 11, dados, {
      query: async () => ({ rows: [] }),
    });
    assert.equal(outro, null);
  });

  it("contexto da IA envia motor e combustível e omite campo vazio", async () => {
    const ctx = await carregarContexto(async (sql) => {
      if (sql.includes("FROM clientes")) return { rows: [{ id: 1 }] };
      return {
        rows: [{
          id: 2,
          marca: "Volkswagen",
          modelo: "Jetta",
          ano: 2016,
          cor: "",
          versao: null,
          motor: "2.0 TSI",
          combustivel: "Gasolina",
        }],
      };
    }, 1, { cliente_id: 1, veiculo_id: 2, km: 80000 });
    assert.equal(ctx.veiculo.motor, "2.0 TSI");
    assert.equal(ctx.veiculo.combustivel, "Gasolina");
    assert.equal(ctx.veiculo.modelo, "Jetta");
    assert.equal("versao" in ctx.veiculo, false);
    assert.equal("cor" in ctx.veiculo, false);
    assert.equal(JSON.stringify(ctx.veiculo).includes("null"), false);
  });
});

function queryRanking(rows) {
  return async (sql) => {
    const texto = String(sql).toUpperCase();
    if (texto.includes("FROM ORDENS_SERVICO OS")) return { rows };
    return { rows: [] };
  };
}

const baseOs = {
  id: 1,
  criado_em: "2024-01-01",
  km: 10000,
  observacoes_veiculo: "veiculo esquentando",
  observacoes_gerais: "",
  marca: "Volkswagen",
  modelo: "Jetta",
  ano: "2016",
};

describe("ranking de casos por motor", () => {
  const atual = {
    tenantId: 1,
    veiculoId: 99,
    marca: "Volkswagen",
    modelo: "Jetta",
    versao: "Comfortline",
    motor: "2.0 TSI",
    combustivel: "Gasolina",
    ano: "2016",
    descricao: "carro esquentando",
  };

  it("mesmo motor vem antes de motor desconhecido", async () => {
    const casos = await buscarCasosSemelhantes(queryRanking([
      { ...baseOs, id: 1, motor: null, combustivel: null, versao: null },
      { ...baseOs, id: 2, motor: "2.0 TSI", combustivel: "Gasolina", versao: "Comfortline" },
    ]), atual);
    assert.equal(casos[0].motor, "2.0 TSI");
    assert.equal(casos[1].motor, undefined);
    assert.equal("pontos" in casos[0], false);
  });

  it("motor conhecido diferente é excluído", async () => {
    const casos = await buscarCasosSemelhantes(queryRanking([
      { ...baseOs, id: 3, motor: "1.4 TSI", combustivel: "Gasolina" },
    ]), atual);
    assert.deepEqual(casos, []);
    assert.equal(avaliarIdentidade({ motor: "2.0 TSI" }, { motor: "1.4 TSI" }), null);
  });

  it("caso legado sem motor continua como candidato parcial", async () => {
    const casos = await buscarCasosSemelhantes(queryRanking([
      { ...baseOs, id: 4, motor: null, combustivel: null, versao: null },
    ]), atual);
    assert.equal(casos.length, 1);
    assert.equal(casos[0].modelo, "Jetta");
  });

  it("combustível diferente fica atrás do combustível igual", async () => {
    const casos = await buscarCasosSemelhantes(queryRanking([
      { ...baseOs, id: 5, motor: "2.0 TSI", combustivel: "Diesel" },
      { ...baseOs, id: 6, motor: "2.0 TSI", combustivel: "Gasolina" },
    ]), atual);
    assert.equal(casos[0].combustivel, "Gasolina");
    assert.equal(casos[1].combustivel, "Diesel");
  });
});
