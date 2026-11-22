import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import pool from "../database.js";
import ordensServicoService from "../src/services/ordensServicoService.js";
import pagamentosOsService, {
  resumoPagamentos,
  assertNaoExcedeTotal,
} from "../src/services/pagamentosOsService.js";
import produtosService from "../src/services/produtosService.js";
import { calcularDeltasEstoque } from "../src/domain/estoqueOs.js";
import { SINGLE_TENANT_ID } from "../src/config/singleTenant.js";

const tenantId = SINGLE_TENANT_ID;

describe("calcularDeltasEstoque (puro)", () => {
  it("soma por produto e ignora peças avulsas", () => {
    const antes = [
      { produto_id: 1, quantidade: 2 },
      { produto_id: 2, quantidade: 1 },
      { produto_id: null, quantidade: 9 },
    ];
    const depois = [
      { produto_id: 1, quantidade: 3 },
      { produto_id: 1, quantidade: 1 },
      { produto_id: 3, quantidade: 5 },
    ];
    assert.deepEqual(calcularDeltasEstoque(antes, depois), [
      { produto_id: 1, delta: 2 },
      { produto_id: 2, delta: -1 },
      { produto_id: 3, delta: 5 },
    ]);
  });

  it("sem mudanças → sem deltas", () => {
    const itens = [{ produto_id: 7, quantidade: 4 }];
    assert.deepEqual(calcularDeltasEstoque(itens, itens), []);
  });
});

describe("resumoPagamentos (puro)", () => {
  it("classifica em aberto, parcial e quitada", () => {
    assert.equal(resumoPagamentos(100, []).situacao, "Em aberto");
    const parcial = resumoPagamentos(100, [{ valor: 40, status: "Recebido" }]);
    assert.equal(parcial.situacao, "Parcial");
    assert.equal(parcial.saldo, 60);
    const quitada = resumoPagamentos(100, [
      { valor: 60, status: "Recebido" },
      { valor: 40, status: "Recebido" },
    ]);
    assert.equal(quitada.situacao, "Quitada");
    const comPendente = resumoPagamentos(100, [
      { valor: 30, status: "Recebido" },
      { valor: 50, status: "Pendente" },
    ]);
    assert.equal(comPendente.valor_pendente, 50);
    assert.equal(comPendente.nao_programado, 20);
  });

  it("bloqueia soma acima do total", () => {
    assert.throws(() => assertNaoExcedeTotal(100, [{ valor: 80 }], 30), /ultrapassa/);
    assert.doesNotThrow(() => assertNaoExcedeTotal(100, [{ valor: 80 }], 20));
  });
});

async function probeDatabase() {
  if (!process.env.DATABASE_URL) return false;
  try {
    const r = await pool.query(
      "SELECT to_regclass('public.os_pagamentos') AS t",
    );
    return Boolean(r.rows[0]?.t);
  } catch {
    return false;
  }
}

const hasDb = await probeDatabase();

describe("OS: edição de itens com ajuste de estoque e pagamentos (DB)", { skip: !hasDb }, () => {
  const ctx = {};

  async function qtd(id) {
    const r = await pool.query("SELECT quantidade FROM produtos WHERE id = $1", [id]);
    return Number(r.rows[0].quantidade);
  }

  before(async () => {
    const tag = `E${Date.now()}`;
    const c = await pool.query(
      "INSERT INTO clientes (nome, telefone, tenant_id) VALUES ($1,$2,$3) RETURNING id",
      [`Cliente ${tag}`, "41999990000", tenantId],
    );
    ctx.clienteId = c.rows[0].id;
    const c2 = await pool.query(
      "INSERT INTO clientes (nome, telefone, tenant_id) VALUES ($1,$2,$3) RETURNING id",
      [`Outro ${tag}`, "41999990001", tenantId],
    );
    ctx.cliente2Id = c2.rows[0].id;
    const v = await pool.query(
      "INSERT INTO veiculos (cliente_id, modelo, placa, tenant_id) VALUES ($1,$2,$3,$4) RETURNING id",
      [ctx.clienteId, "Onix", `ED${tag.slice(-5)}`, tenantId],
    );
    ctx.veiculoId = v.rows[0].id;
    const v2 = await pool.query(
      "INSERT INTO veiculos (cliente_id, modelo, placa, tenant_id) VALUES ($1,$2,$3,$4) RETURNING id",
      [ctx.cliente2Id, "HB20", `EE${tag.slice(-5)}`, tenantId],
    );
    ctx.veiculo2Id = v2.rows[0].id;
    const pA = await pool.query(
      "INSERT INTO produtos (nome, codigo, quantidade, valor_venda, tenant_id) VALUES ($1,$2,10,30,$3) RETURNING id",
      [`Pastilha ${tag}`, `PA-${tag}`, tenantId],
    );
    const pB = await pool.query(
      "INSERT INTO produtos (nome, codigo, quantidade, valor_venda, tenant_id) VALUES ($1,$2,5,50,$3) RETURNING id",
      [`Disco ${tag}`, `PB-${tag}`, tenantId],
    );
    ctx.pA = pA.rows[0].id;
    ctx.pB = pB.rows[0].id;
    ctx.tag = tag;

    const os = await ordensServicoService.criar(tenantId, {
      cliente_id: ctx.clienteId,
      veiculo_id: ctx.veiculoId,
      km: 1000,
      produtos: [
        { produto_id: ctx.pA, codigo: "A", descricao: "Pastilha", quantidade: 2, valor_unitario: 30, valor_total: 60 },
      ],
      servicos: [
        { codigo: "S1", descricao: "Troca", quantidade: 1, valor_unitario: 100, valor_total: 100 },
      ],
    });
    ctx.osId = os.id;
  });

  after(async () => {
    if (!ctx.osId) return;
    await pool.query("DELETE FROM movimentacoes_estoque WHERE os_id = $1 OR produto_id = ANY($2)", [
      ctx.osId,
      [ctx.pA, ctx.pB],
    ]);
    await pool.query("DELETE FROM ordens_servico WHERE id = $1", [ctx.osId]);
    await pool.query("DELETE FROM produtos WHERE id = ANY($1)", [[ctx.pA, ctx.pB]]);
    await pool.query("DELETE FROM veiculos WHERE id = ANY($1)", [[ctx.veiculoId, ctx.veiculo2Id]]);
    await pool.query("DELETE FROM clientes WHERE id = ANY($1)", [[ctx.clienteId, ctx.cliente2Id]]);
  });

  it("criação baixa o estoque", async () => {
    assert.equal(await qtd(ctx.pA), 8);
  });

  it("sem editar_itens, itens enviados não alteram a OS (contrato antigo)", async () => {
    await ordensServicoService.atualizar(tenantId, ctx.osId, {
      status: "Aberta",
      produtos: [],
      servicos: [],
    });
    const os = await ordensServicoService.buscarPorId(tenantId, ctx.osId);
    assert.equal(os.produtos.length, 1);
    assert.equal(Number(os.valor_total), 160);
  });

  it("editar itens ajusta estoque pela diferença e recalcula totais", async () => {
    await ordensServicoService.atualizar(tenantId, ctx.osId, {
      editar_itens: true,
      produtos: [
        { produto_id: ctx.pA, codigo: "A", descricao: "Pastilha", quantidade: 1, valor_unitario: 30, valor_total: 30 },
        { produto_id: ctx.pB, codigo: "B", descricao: "Disco", quantidade: 2, valor_unitario: 50, valor_total: 100 },
        { produto_id: null, codigo: "", descricao: "Parafuso avulso", quantidade: 4, valor_unitario: 2, valor_total: 8 },
      ],
      servicos: [
        { codigo: "S1", descricao: "Troca", quantidade: 1, valor_unitario: 120, valor_total: 120 },
      ],
    });
    assert.equal(await qtd(ctx.pA), 9, "devolve 1 pastilha");
    assert.equal(await qtd(ctx.pB), 3, "baixa 2 discos");
    const os = await ordensServicoService.buscarPorId(tenantId, ctx.osId);
    assert.equal(os.produtos.length, 3);
    assert.equal(Number(os.valor_produtos), 138);
    assert.equal(Number(os.valor_servicos), 120);
    assert.equal(Number(os.valor_total), 258);
    const mov = await pool.query(
      "SELECT tipo, quantidade, motivo FROM movimentacoes_estoque WHERE os_id = $1 AND motivo LIKE 'Ajuste na OS%' ORDER BY id",
      [ctx.osId],
    );
    assert.equal(mov.rows.length, 2);
  });

  it("edição com estoque insuficiente falha e nada muda (transação)", async () => {
    await assert.rejects(
      ordensServicoService.atualizar(tenantId, ctx.osId, {
        editar_itens: true,
        produtos: [
          { produto_id: ctx.pB, codigo: "B", descricao: "Disco", quantidade: 99, valor_unitario: 50, valor_total: 4950 },
        ],
        servicos: [],
      }),
      /Estoque insuficiente/,
    );
    assert.equal(await qtd(ctx.pB), 3);
    assert.equal(await qtd(ctx.pA), 9);
    const os = await ordensServicoService.buscarPorId(tenantId, ctx.osId);
    assert.equal(os.produtos.length, 3);
  });

  it("troca de veículo exige veículo do cliente", async () => {
    await assert.rejects(
      ordensServicoService.atualizar(tenantId, ctx.osId, { veiculo_id: ctx.veiculo2Id }),
      /Veículo não pertence/,
    );
    await ordensServicoService.atualizar(tenantId, ctx.osId, {
      cliente_id: ctx.cliente2Id,
      veiculo_id: ctx.veiculo2Id,
    });
    const os = await ordensServicoService.buscarPorId(tenantId, ctx.osId);
    assert.equal(os.veiculo_id, ctx.veiculo2Id);
  });

  it("pagamentos: registra, resume e bloqueia excesso", async () => {
    await pagamentosOsService.registrar(tenantId, ctx.osId, {
      valor: 100,
      forma_pagamento: "PIX",
      status: "Recebido",
      data_pagamento: "2026-11-10",
    });
    const pend = await pagamentosOsService.registrar(tenantId, ctx.osId, {
      valor: 100,
      forma_pagamento: "Boleto",
      status: "Pendente",
      data_vencimento: "2026-12-10",
    });
    await assert.rejects(
      pagamentosOsService.registrar(tenantId, ctx.osId, {
        valor: 100,
        forma_pagamento: "Dinheiro",
      }),
      /ultrapassa/,
    );
    let r = await pagamentosOsService.listarPorOs(tenantId, ctx.osId);
    assert.equal(r.resumo.valor_recebido, 100);
    assert.equal(r.resumo.valor_pendente, 100);
    assert.equal(r.resumo.situacao, "Parcial");

    await pagamentosOsService.atualizar(tenantId, ctx.osId, pend.id, {
      status: "Recebido",
      data_pagamento: "2026-11-12",
    });
    r = await pagamentosOsService.listarPorOs(tenantId, ctx.osId);
    assert.equal(r.resumo.valor_recebido, 200);

    const lista = await ordensServicoService.listar(tenantId, { busca: ctx.tag.slice(-5) });
    const linha = lista.rows.find((x) => x.id === ctx.osId);
    assert.equal(Number(linha?.valor_recebido), 200);
  });

  it("edição não pode deixar total abaixo do já pago", async () => {
    await assert.rejects(
      ordensServicoService.atualizar(tenantId, ctx.osId, {
        editar_itens: true,
        produtos: [],
        servicos: [
          { codigo: "S1", descricao: "Troca", quantidade: 1, valor_unitario: 10, valor_total: 10 },
        ],
      }),
      /ultrapassa/,
    );
  });

  it("resumo financeiro do período considera recebimentos", async () => {
    const res = await pagamentosOsService.resumoFinanceiro(tenantId, {
      data_inicio: "2026-11-01",
      data_fim: "2026-11-30",
    });
    assert.ok(res.entradas >= 200);
    assert.ok(res.serie.some((d) => d.dia === "2026-11-12"));
  });

  it("finalizar uma vez grava finalizado_em e não muda em edições posteriores", async () => {
    await ordensServicoService.atualizar(tenantId, ctx.osId, { status: "Em andamento" });
    await ordensServicoService.atualizar(tenantId, ctx.osId, { status: "Finalizada" });
    const a = await pool.query("SELECT finalizado_em FROM ordens_servico WHERE id=$1", [ctx.osId]);
    await new Promise((r) => setTimeout(r, 20));
    await ordensServicoService.atualizar(tenantId, ctx.osId, { status: "Finalizada", km: 2000 });
    const b = await pool.query("SELECT finalizado_em FROM ordens_servico WHERE id=$1", [ctx.osId]);
    assert.equal(a.rows[0].finalizado_em.getTime(), b.rows[0].finalizado_em.getTime());
    await assert.rejects(
      ordensServicoService.atualizar(tenantId, ctx.osId, { editar_itens: true, produtos: [], servicos: [] }),
      /Aberta ou Em andamento/,
    );
  });

  it("movimentação manual e histórico de produto", async () => {
    await produtosService.movimentar(tenantId, ctx.pB, {
      tipo: "ENTRADA",
      quantidade: 7,
      motivo: "Compra fornecedor",
    });
    assert.equal(await qtd(ctx.pB), 10);
    await assert.rejects(
      produtosService.movimentar(tenantId, ctx.pB, { tipo: "SAIDA", quantidade: 999, motivo: "Perda" }),
      /insuficiente/,
    );
    const hist = await produtosService.listarMovimentacoes(tenantId, { produto_id: ctx.pB });
    assert.ok(hist.rows.some((m) => m.motivo === "Compra fornecedor"));
    assert.ok(hist.rows.some((m) => m.os_numero));
  });
});
