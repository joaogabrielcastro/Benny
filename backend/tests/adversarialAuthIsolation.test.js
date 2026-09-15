import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../src/config/jwt.js";
import { requireAuth } from "../src/middleware/authMiddleware.js";
import { requireRole } from "../src/middleware/requireRole.js";
import { ROLES } from "../src/config/roles.js";
import { updateOrdemServicoSchema } from "../src/schemas/comercialSchemas.js";
import { createContaPagarSchema } from "../src/schemas/contaPagarSchemas.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("adversariais — auth e autorização", () => {
  it("bloqueia acesso sem token", () => {
    const res = mockRes();
    let nextCalled = false;
    requireAuth({ headers: {} }, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  });

  it("bloqueia token com assinatura inválida", () => {
    const bad = jwt.sign(
      { userId: 1, tenantId: 1, email: "a@b.com", role: "admin" },
      "wrong-secret",
    );
    const res = mockRes();
    let nextCalled = false;
    requireAuth({ headers: { authorization: `Bearer ${bad}` } }, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  });

  it("mecanico não acessa rota admin-only (privilege escalation vertical)", () => {
    const token = jwt.sign(
      {
        userId: 2,
        tenantId: 1,
        email: "mec@oficina.com",
        nome: "Mec",
        role: ROLES.MECANICO,
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    requireAuth(req, mockRes(), () => {});
    assert.equal(req.user.role, ROLES.MECANICO);

    const gate = requireRole(ROLES.ADMIN);
    let gateErr = null;
    gate(req, mockRes(), (err) => {
      gateErr = err ?? null;
    });
    assert.ok(gateErr);
    assert.equal(gateErr.statusCode, 403);
  });

  it("admin passa no gate admin-only", () => {
    const token = jwt.sign(
      {
        userId: 1,
        tenantId: 1,
        email: "admin@oficina.com",
        nome: "Admin",
        role: ROLES.ADMIN,
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    requireAuth(req, mockRes(), () => {});
    const gate = requireRole(ROLES.ADMIN);
    let gateErr = "sentinel";
    gate(req, mockRes(), (err) => {
      gateErr = err;
    });
    assert.equal(gateErr, undefined);
  });
});

describe("adversariais — validação de negócio", () => {
  it("rejeita status de OS fora do enum", () => {
    const parsed = updateOrdemServicoSchema.safeParse({
      status: "Finalizadaa",
    });
    assert.equal(parsed.success, false);
  });

  it("rejeita valor negativo em conta a pagar", () => {
    const parsed = createContaPagarSchema.safeParse({
      descricao: "x",
      categoria: "Geral",
      valor: -10,
      data_vencimento: "2026-01-01",
    });
    assert.equal(parsed.success, false);
  });

  it("rejeita valor zero em conta a pagar", () => {
    const parsed = createContaPagarSchema.safeParse({
      descricao: "x",
      categoria: "Geral",
      valor: 0,
      data_vencimento: "2026-01-01",
    });
    assert.equal(parsed.success, false);
  });
});
