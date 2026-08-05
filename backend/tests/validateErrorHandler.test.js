import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ZodError, z } from "zod";
import { validate } from "../src/lib/validate.js";
import { AppError } from "../src/lib/AppError.js";
import { errorHandler, notFoundHandler } from "../src/middleware/errorHandler.js";

describe("validate middleware", () => {
  it("passa dados válidos em req.validated.body", () => {
    const schema = z.object({ nome: z.string().min(1) });
    const mw = validate(schema);
    const req = { body: { nome: "Ok" } };
    let nextErr;
    mw(req, {}, (err) => {
      nextErr = err;
    });
    assert.equal(nextErr, undefined);
    assert.equal(req.validated.body.nome, "Ok");
  });

  it("falha com AppError 400 em body inválido", () => {
    const schema = z.object({ nome: z.string().min(1) });
    const mw = validate(schema);
    const req = { body: { nome: "" } };
    let nextErr;
    mw(req, {}, (err) => {
      nextErr = err;
    });
    assert.ok(nextErr instanceof AppError);
    assert.equal(nextErr.statusCode, 400);
  });

  it("valida params", () => {
    const schema = z.object({ id: z.coerce.number().int().positive() });
    const mw = validate(schema, "params");
    const req = { params: { id: "12" } };
    mw(req, {}, () => {});
    assert.equal(req.validated.params.id, 12);
  });
});

describe("errorHandler", () => {
  function mockRes() {
    return {
      statusCode: 200,
      body: null,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(b) {
        this.body = b;
        return this;
      },
    };
  }

  it("notFoundHandler 404", () => {
    const res = mockRes();
    notFoundHandler({}, res);
    assert.equal(res.statusCode, 404);
  });

  it("AppError propaga status e details", () => {
    const res = mockRes();
    errorHandler(
      new AppError(403, "Negado", { code: "X" }),
      { originalUrl: "/", method: "GET" },
      res,
      () => {},
    );
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, "Negado");
    assert.equal(res.body.code, "X");
  });

  it("ZodError → 400", () => {
    const res = mockRes();
    let zodErr;
    try {
      z.object({ a: z.string() }).parse({});
    } catch (e) {
      zodErr = e;
    }
    assert.ok(zodErr instanceof ZodError);
    errorHandler(zodErr, { originalUrl: "/", method: "POST" }, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  it("Postgres 23505 → 409", () => {
    const res = mockRes();
    errorHandler(
      Object.assign(new Error("dup"), { code: "23505" }),
      { originalUrl: "/", method: "POST" },
      res,
      () => {},
    );
    assert.equal(res.statusCode, 409);
  });

  it("Postgres 23503 → 400", () => {
    const res = mockRes();
    errorHandler(
      Object.assign(new Error("fk"), { code: "23503" }),
      { originalUrl: "/", method: "POST" },
      res,
      () => {},
    );
    assert.equal(res.statusCode, 400);
  });
});
