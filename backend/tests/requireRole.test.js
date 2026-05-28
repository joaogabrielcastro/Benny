import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requireRole } from "../src/middleware/requireRole.js";

describe("requireRole", () => {
  it("permite admin nas rotas admin", () => {
    const mw = requireRole("admin");
    const req = { user: { role: "admin" } };
    let nextErr = null;
    mw(req, {}, (err) => {
      nextErr = err;
    });
    assert.equal(nextErr, undefined);
  });

  it("permite mecanico quando listado", () => {
    const mw = requireRole("admin", "mecanico");
    const req = { user: { role: "mecanico" } };
    let nextErr = null;
    mw(req, {}, (err) => {
      nextErr = err;
    });
    assert.equal(nextErr, undefined);
  });

  it("bloqueia mecanico em rota só admin", () => {
    const mw = requireRole("admin");
    const req = { user: { role: "mecanico" } };
    let nextErr = null;
    mw(req, {}, (err) => {
      nextErr = err;
    });
    assert.ok(nextErr);
    assert.equal(nextErr.statusCode, 403);
  });

  it("trata role legada user como admin", () => {
    const mw = requireRole("admin");
    const req = { user: { role: "user" } };
    let nextErr = null;
    mw(req, {}, (err) => {
      nextErr = err;
    });
    assert.equal(nextErr, undefined);
  });
});
