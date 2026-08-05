import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  clearAuthCookieOptions,
  parseCookies,
  extractTokenFromRequest,
} from "../src/lib/authCookie.js";
import { requireAuth } from "../src/middleware/authMiddleware.js";
import { JWT_SECRET } from "../src/config/jwt.js";
import { SINGLE_TENANT_MODE } from "../src/config/singleTenant.js";

describe("authCookie", () => {
  it("parseCookies extrai pares key=value", () => {
    const req = {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=abc%20123; other=x`,
      },
    };
    const cookies = parseCookies(req);
    assert.equal(cookies[AUTH_COOKIE_NAME], "abc 123");
    assert.equal(cookies.other, "x");
  });

  it("parseCookies retorna {} sem header", () => {
    assert.deepEqual(parseCookies({ headers: {} }), {});
    assert.deepEqual(parseCookies({}), {});
  });

  it("extractTokenFromRequest prioriza Bearer", () => {
    const req = {
      headers: {
        authorization: "Bearer from-header",
        cookie: `${AUTH_COOKIE_NAME}=from-cookie`,
      },
    };
    assert.equal(extractTokenFromRequest(req), "from-header");
  });

  it("extractTokenFromRequest usa cookie se não houver Bearer", () => {
    const req = {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=cookie-token`,
      },
    };
    assert.equal(extractTokenFromRequest(req), "cookie-token");
  });

  it("extractTokenFromRequest retorna null sem token", () => {
    assert.equal(extractTokenFromRequest({ headers: {} }), null);
  });

  it("authCookieOptions usa sameSite lax ou none", () => {
    const opts = authCookieOptions();
    assert.equal(opts.httpOnly, true);
    assert.ok(opts.sameSite === "lax" || opts.sameSite === "none");
    assert.equal(opts.path, "/");
  });

  it("clearAuthCookieOptions preserva domain/path", () => {
    const clear = clearAuthCookieOptions();
    assert.equal(clear.path, "/");
    assert.equal(clear.httpOnly, true);
    assert.equal("maxAge" in clear, false);
  });
});

describe("requireAuth", () => {
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

  it("rejeita sem token (401)", () => {
    const req = { headers: {} };
    const res = mockRes();
    let called = false;
    requireAuth(req, res, () => {
      called = true;
    });
    assert.equal(called, false);
    assert.equal(res.statusCode, 401);
  });

  it("aceita JWT válido via Bearer", () => {
    const token = jwt.sign(
      {
        userId: 1,
        tenantId: 7,
        email: "a@b.com",
        nome: "Admin",
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let called = false;
    requireAuth(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal(req.user.email, "a@b.com");
    assert.equal(req.user.role, "admin");
  });

  it("aceita JWT válido via cookie httpOnly", () => {
    const token = jwt.sign(
      {
        userId: 2,
        tenantId: 3,
        email: "m@b.com",
        nome: "Mec",
        role: "mecanico",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    const req = {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    };
    const res = mockRes();
    let called = false;
    requireAuth(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal(req.user.role, "mecanico");
  });

  it("rejeita token expirado", () => {
    const token = jwt.sign(
      {
        userId: 1,
        tenantId: 1,
        email: "a@b.com",
        nome: "A",
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: -10 },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    requireAuth(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.match(res.body.error, /expirad/i);
  });

  it("rejeita role inválida no token", () => {
    const token = jwt.sign(
      {
        userId: 1,
        tenantId: 1,
        email: "a@b.com",
        nome: "A",
        role: "hacker",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    requireAuth(req, res, () => {});
    assert.equal(res.statusCode, 401);
  });

  it("rejeita token sem tenant em multi-tenant", () => {
    if (SINGLE_TENANT_MODE) return;
    const token = jwt.sign(
      {
        userId: 1,
        email: "a@b.com",
        nome: "A",
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    requireAuth(req, res, () => {});
    assert.equal(res.statusCode, 401);
  });
});
