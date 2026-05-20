import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppError, notFound } from "../src/lib/AppError.js";

describe("AppError", () => {
  it("notFound cria 404", () => {
    const err = notFound("x");
    assert.equal(err.statusCode, 404);
    assert.equal(err.message, "x");
  });

  it("AppError guarda details", () => {
    const err = new AppError(400, "inválido", { field: "nome" });
    assert.equal(err.details.field, "nome");
  });
});
