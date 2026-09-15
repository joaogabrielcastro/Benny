import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { paginate } from "../src/middleware/paginate.js";

describe("paginate middleware", () => {
  it("aplica default quando limit ausente", () => {
    const req = { query: {} };
    paginate(req, {}, () => {});
    assert.deepEqual(req.pagination, { limit: 20, offset: 0, page: 1 });
  });

  it("respeita limit alto para catálogos", () => {
    const req = { query: { limit: "5000", page: "2" } };
    paginate(req, {}, () => {});
    assert.equal(req.pagination.limit, 5000);
    assert.equal(req.pagination.page, 2);
    assert.equal(req.pagination.offset, 5000);
  });

  it("limita limit máximo a 10000", () => {
    const req = { query: { limit: "999999" } };
    paginate(req, {}, () => {});
    assert.equal(req.pagination.limit, 10000);
  });

  it("trata array query (express) sem cair no default indevido", () => {
    const req = { query: { limit: ["100"], page: ["1"] } };
    paginate(req, {}, () => {});
    assert.equal(req.pagination.limit, 100);
  });
});
