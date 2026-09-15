/**
 * Isolamento multi-tenant real (Postgres).
 * Roda somente com:
 *   SINGLE_TENANT_MODE=false DATABASE_URL=... npm test -- tests/multiTenantIsolation.test.js
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import pool from "../database.js";
import clientesService from "../src/services/clientesService.js";
import produtosService from "../src/services/produtosService.js";
import ordensServicoService from "../src/services/ordensServicoService.js";
import { baixarEstoqueProduto } from "../src/services/estoqueMovimentacao.js";

const enabled =
  process.env.DATABASE_URL &&
  process.env.SINGLE_TENANT_MODE === "false" &&
  process.env.ASE52_MULTI_TENANT === "1";

async function ensureTenant(slug, nome, email) {
  const existing = await pool.query(
    "SELECT id FROM tenants WHERE slug = $1",
    [slug],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const ins = await pool.query(
    `INSERT INTO tenants (nome, slug, email, status, plano, subscription_status)
     VALUES ($1,$2,$3,'active','basic','active') RETURNING id`,
    [nome, slug, email],
  );
  return ins.rows[0].id;
}

describe("ASE 5.2 multi-tenant isolation (Postgres real)", {
  skip: !enabled,
}, () => {
  const ctx = {
    tenantA: null,
    tenantB: null,
    clienteA: null,
    clienteB: null,
    produtoA: null,
    produtoB: null,
    osA: null,
  };

  before(async () => {
    await pool.query(
      "ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS tenant_id INTEGER",
    );
    ctx.tenantA = await ensureTenant(
      "ase52-tenant-a",
      "Oficina A ASE52",
      "tenant-a-ase52@test.local",
    );
    ctx.tenantB = await ensureTenant(
      "ase52-tenant-b",
      "Oficina B ASE52",
      "tenant-b-ase52@test.local",
    );

    const hash = await bcrypt.hash("senha-teste-ase52", 4);
    for (const [tenantId, email] of [
      [ctx.tenantA, "admin-a-ase52@test.local"],
      [ctx.tenantB, "admin-b-ase52@test.local"],
    ]) {
      const existingUser = await pool.query(
        "SELECT id FROM usuarios WHERE email = $1",
        [email],
      );
      if (existingUser.rows[0]) {
        await pool.query(
          "UPDATE usuarios SET tenant_id = $1, senha_hash = $2, role = 'admin', ativo = TRUE WHERE email = $3",
          [tenantId, hash, email],
        );
      } else {
        await pool.query(
          `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, role, ativo)
           VALUES ($1,$2,$3,$4,'admin',TRUE)`,
          [tenantId, "Admin", email, hash],
        );
      }
    }

    ctx.clienteA = await clientesService.criar(ctx.tenantA, {
      nome: "Cliente A ASE52",
      telefone: "41999990001",
    });
    ctx.clienteB = await clientesService.criar(ctx.tenantB, {
      nome: "Cliente B ASE52",
      telefone: "41999990002",
    });

    const veicA = await pool.query(
      `INSERT INTO veiculos (cliente_id, modelo, placa, tenant_id)
       VALUES ($1,'Uno','AAA1A11',$2) RETURNING id`,
      [ctx.clienteA.id, ctx.tenantA],
    );

    ctx.produtoA = await produtosService.criar(ctx.tenantA, {
      codigo: `PA-${Date.now()}`,
      nome: "Filtro A",
      quantidade: 10,
      valor_venda: 20,
      estoque_minimo: 0,
    });
    ctx.produtoB = await produtosService.criar(ctx.tenantB, {
      codigo: `PB-${Date.now()}`,
      nome: "Filtro B",
      quantidade: 10,
      valor_venda: 20,
      estoque_minimo: 0,
    });

    ctx.osA = await ordensServicoService.criar(ctx.tenantA, {
      cliente_id: ctx.clienteA.id,
      veiculo_id: veicA.rows[0].id,
      km: 1000,
      produtos: [
        {
          produto_id: ctx.produtoA.id,
          codigo: ctx.produtoA.codigo,
          descricao: "Filtro A",
          quantidade: 1,
          valor_unitario: 20,
          valor_total: 20,
        },
      ],
      servicos: [],
    });
  });

  after(async () => {
    if (ctx.osA?.id) {
      await ordensServicoService.deletar(ctx.tenantA, ctx.osA.id).catch(() => {});
    }
    for (const [tenantId, produto] of [
      [ctx.tenantA, ctx.produtoA],
      [ctx.tenantB, ctx.produtoB],
    ]) {
      if (produto?.id) {
        await pool.query(
          "DELETE FROM movimentacoes_estoque WHERE produto_id = $1",
          [produto.id],
        );
        await produtosService.deletar(tenantId, produto.id).catch(() => {});
      }
    }
    if (ctx.clienteA?.id) {
      await clientesService.deletar(ctx.tenantA, ctx.clienteA.id).catch(() => {});
    }
    if (ctx.clienteB?.id) {
      await clientesService.deletar(ctx.tenantB, ctx.clienteB.id).catch(() => {});
    }
  });

  it("Tenant B NÃO lê cliente do Tenant A", async () => {
    const row = await clientesService.buscarPorId(ctx.tenantB, ctx.clienteA.id);
    assert.equal(row, null);
  });

  it("Tenant B NÃO lê produto do Tenant A", async () => {
    const row = await produtosService.buscarPorId(ctx.tenantB, ctx.produtoA.id);
    assert.equal(row, null);
  });

  it("Tenant B NÃO lê OS do Tenant A", async () => {
    const row = await ordensServicoService.buscarPorId(ctx.tenantB, ctx.osA.id);
    assert.equal(row, null);
  });

  it("Tenant B NÃO atualiza OS do Tenant A", async () => {
    const result = await ordensServicoService.atualizar(
      ctx.tenantB,
      ctx.osA.id,
      { status: "Cancelada" },
    );
    assert.equal(result, null);
    const still = await ordensServicoService.buscarPorId(
      ctx.tenantA,
      ctx.osA.id,
    );
    assert.ok(still);
    assert.equal(still.status, "Aberta");
  });

  it("Tenant B NÃO exclui OS do Tenant A", async () => {
    const result = await ordensServicoService.deletar(ctx.tenantB, ctx.osA.id);
    assert.equal(result, null);
    const still = await ordensServicoService.buscarPorId(
      ctx.tenantA,
      ctx.osA.id,
    );
    assert.ok(still);
  });

  it("baixa de estoque do Tenant B falha no produto do Tenant A", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await assert.rejects(
        () =>
          baixarEstoqueProduto(client, {
            tenantId: ctx.tenantB,
            produtoId: ctx.produtoA.id,
            quantidade: 1,
            motivo: "tentativa cross-tenant",
          }),
        (err) => err.statusCode === 400,
      );
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  it("auditoria exige OS no tenant (cross-tenant → 404)", async () => {
    const { default: auditoriaController } = await import(
      "../src/controllers/auditoriaController.js"
    );
    const req = {
      params: { id: String(ctx.osA.id) },
      tenantId: ctx.tenantB,
      user: { tenantId: ctx.tenantB },
    };
    let status = null;
    let body = null;
    const res = {
      status(code) {
        status = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      },
    };
    await assert.rejects(
      () => auditoriaController.buscarPorOS(req, res),
      (err) => err.statusCode === 404,
    );
    assert.equal(status, null);
    assert.equal(body, null);
  });
});
