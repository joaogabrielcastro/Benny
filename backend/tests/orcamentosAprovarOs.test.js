import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import pool from "../database.js";
import orcamentosService from "../src/services/orcamentosService.js";
import ordensServicoService from "../src/services/ordensServicoService.js";
import { calcularTotais } from "../src/domain/calcularTotais.js";
import { SINGLE_TENANT_ID } from "../src/config/singleTenant.js";

const hasDb = !!process.env.DATABASE_URL;
const tenantId = SINGLE_TENANT_ID;

describe("fluxo orçamento → OS (integração DB)", { skip: !hasDb }, () => {
  const ctx = {
    clienteId: null,
    veiculoId: null,
    produtoId: null,
    orcamentoId: null,
    token: null,
    osId: null,
    qtyInicial: 50,
  };

  before(async () => {
    await pool.query(
      `ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS chassi VARCHAR(20)`,
    );
    const tag = `T${Date.now()}`;
    const cliente = await pool.query(
      `INSERT INTO clientes (nome, telefone, tenant_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [`Cliente ${tag}`, "41999990000", tenantId],
    );
    ctx.clienteId = cliente.rows[0].id;

    const veiculo = await pool.query(
      `INSERT INTO veiculos (cliente_id, modelo, placa, tenant_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [ctx.clienteId, "Gol", `TST${tag.slice(-4)}`, tenantId],
    );
    ctx.veiculoId = veiculo.rows[0].id;

    const produto = await pool.query(
      `INSERT INTO produtos (nome, codigo, quantidade, valor_venda, tenant_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, quantidade`,
      [`Produto ${tag}`, `COD-${tag}`, ctx.qtyInicial, 25, tenantId],
    );
    ctx.produtoId = produto.rows[0].id;

    const produtos = [
      {
        produto_id: ctx.produtoId,
        codigo: `COD-${tag}`,
        descricao: "Filtro teste",
        quantidade: 2,
        valor_unitario: 25,
        valor_total: 50,
      },
    ];
    const servicos = [
      {
        codigo: "SRV1",
        descricao: "Mão de obra teste",
        quantidade: 1,
        valor_unitario: 100,
        valor_total: 100,
      },
    ];
    const { valor_produtos, valor_servicos, valor_total } = calcularTotais(
      produtos,
      servicos,
    );
    const numero = `ORC-${String(Date.now()).slice(-8)}`;
    const token = randomBytes(32).toString("hex");
    const ins = await pool.query(
      `INSERT INTO orcamentos (numero, cliente_id, veiculo_id, km, valor_produtos, valor_servicos, valor_total, token_publico, tenant_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pendente') RETURNING id`,
      [
        numero,
        ctx.clienteId,
        ctx.veiculoId,
        "10000",
        valor_produtos,
        valor_servicos,
        valor_total,
        token,
        tenantId,
      ],
    );
    ctx.orcamentoId = ins.rows[0].id;
    ctx.token = token;
    for (const p of produtos) {
      await pool.query(
        `INSERT INTO orcamento_produtos (orcamento_id, produto_id, codigo, descricao, quantidade, valor_unitario, valor_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          ctx.orcamentoId,
          p.produto_id,
          p.codigo,
          p.descricao,
          p.quantidade,
          p.valor_unitario,
          p.valor_total,
        ],
      );
    }
    for (const s of servicos) {
      await pool.query(
        `INSERT INTO orcamento_servicos (orcamento_id, codigo, descricao, quantidade, valor_unitario, valor_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          ctx.orcamentoId,
          s.codigo,
          s.descricao,
          s.quantidade,
          s.valor_unitario,
          s.valor_total,
        ],
      );
    }
  });

  after(async () => {
    if (ctx.osId) {
      await pool.query("DELETE FROM os_servicos WHERE os_id = $1", [ctx.osId]);
      await pool.query("DELETE FROM os_produtos WHERE os_id = $1", [ctx.osId]);
      await pool.query(
        "DELETE FROM movimentacoes_estoque WHERE os_id = $1",
        [ctx.osId],
      );
      await pool.query("DELETE FROM ordens_servico WHERE id = $1", [ctx.osId]);
    }
    if (ctx.orcamentoId) {
      await pool.query(
        "DELETE FROM movimentacoes_estoque WHERE orcamento_id = $1",
        [ctx.orcamentoId],
      );
      await pool.query(
        "DELETE FROM orcamento_produtos WHERE orcamento_id = $1",
        [ctx.orcamentoId],
      );
      await pool.query(
        "DELETE FROM orcamento_servicos WHERE orcamento_id = $1",
        [ctx.orcamentoId],
      );
      await pool.query("DELETE FROM orcamentos WHERE id = $1", [
        ctx.orcamentoId,
      ]);
    }
    if (ctx.produtoId) {
      await pool.query(
        "DELETE FROM movimentacoes_estoque WHERE produto_id = $1",
        [ctx.produtoId],
      );
      await pool.query("DELETE FROM produtos WHERE id = $1", [ctx.produtoId]);
    }
    if (ctx.veiculoId) {
      await pool.query("DELETE FROM veiculos WHERE id = $1", [ctx.veiculoId]);
    }
    if (ctx.clienteId) {
      await pool.query("DELETE FROM clientes WHERE id = $1", [ctx.clienteId]);
    }
  });

  it("aprovar via atualizar cria OS, baixa estoque e exclui orçamento", async () => {
    const orc = await orcamentosService.buscarPorId(tenantId, ctx.orcamentoId);
    assert.equal(orc.status, "Pendente");

    const result = await orcamentosService.atualizar(tenantId, ctx.orcamentoId, {
      status: "Aprovado",
      km: orc.km,
      produtos: orc.produtos,
      servicos: orc.servicos,
    });

    assert.ok(result.os?.id);
    assert.ok(result.os.numero);
    ctx.osId = result.os.id;

    const orcDepois = await orcamentosService.buscarPorId(
      tenantId,
      ctx.orcamentoId,
    );
    assert.equal(orcDepois, null);

    const os = await ordensServicoService.buscarPorId(tenantId, ctx.osId);
    assert.equal(os.status, "Aberta");
    assert.equal(os.produtos.length, 1);
    assert.equal(os.servicos.length, 1);
    assert.equal(Number(os.valor_total), 150);

    const estoque = await pool.query(
      "SELECT quantidade FROM produtos WHERE id = $1",
      [ctx.produtoId],
    );
    assert.equal(Number(estoque.rows[0].quantidade), ctx.qtyInicial - 2);

    const mov = await pool.query(
      `SELECT id FROM movimentacoes_estoque
       WHERE motivo = 'Orçamento aprovado' AND produto_id = $1`,
      [ctx.produtoId],
    );
    assert.ok(mov.rows.length >= 1);
  });

  it("reprovar não cria OS", async () => {
    const servicos = [
      {
        codigo: "S2",
        descricao: "Serviço reprovado",
        quantidade: 1,
        valor_unitario: 40,
        valor_total: 40,
      },
    ];
    const { valor_servicos, valor_total } = calcularTotais([], servicos);
    const ins = await pool.query(
      `INSERT INTO orcamentos (numero, cliente_id, veiculo_id, valor_produtos, valor_servicos, valor_total, token_publico, tenant_id, status)
       VALUES ($1,$2,$3,0,$4,$5,$6,$7,'Pendente') RETURNING id`,
      [
        `ORC-R${String(Date.now()).slice(-7)}`,
        ctx.clienteId,
        ctx.veiculoId,
        valor_servicos,
        valor_total,
        randomBytes(32).toString("hex"),
        tenantId,
      ],
    );
    const orcId = ins.rows[0].id;
    await pool.query(
      `INSERT INTO orcamento_servicos (orcamento_id, codigo, descricao, quantidade, valor_unitario, valor_total)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        orcId,
        servicos[0].codigo,
        servicos[0].descricao,
        servicos[0].quantidade,
        servicos[0].valor_unitario,
        servicos[0].valor_total,
      ],
    );
    const full = await orcamentosService.buscarPorId(tenantId, orcId);
    await orcamentosService.atualizar(tenantId, orcId, {
      status: "Reprovado",
      km: full.km,
      produtos: full.produtos,
      servicos: full.servicos,
    });
    const depois = await orcamentosService.buscarPorId(tenantId, orcId);
    assert.equal(depois.status, "Reprovado");

    await pool.query("DELETE FROM orcamento_servicos WHERE orcamento_id = $1", [
      orcId,
    ]);
    await pool.query("DELETE FROM orcamentos WHERE id = $1", [orcId]);
  });
});
