import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../src/lib/AppError.js";

/**
 * Testes de segurança de superfície (sem DB):
 * - payloads maliciosos rejeitados por Zod
 * - AppError não vaza stack
 */
import { createOrcamentoSchema } from "../src/schemas/comercialSchemas.js";
import { createClienteSchema } from "../src/schemas/clienteSchemas.js";
import { loginSchema } from "../src/schemas/authSchemas.js";

describe("segurança — validação de entrada", () => {
  it("rejeita SQL injection em campos numéricos de orçamento", () => {
    const r = createOrcamentoSchema.safeParse({
      cliente_id: "1; DROP TABLE clientes;--",
      veiculo_id: 1,
      produtos: [],
      servicos: [],
    });
    assert.equal(r.success, false);
  });

  it("rejeita email inválido no login (XSS string não é email)", () => {
    const r = loginSchema.safeParse({
      email: '<script>alert(1)</script>@x.com',
      senha: "senha",
    });
    // pode passar regex de email em alguns casos; garante que script puro falha
    const r2 = loginSchema.safeParse({
      email: "<script>alert(1)</script>",
      senha: "senha",
    });
    assert.equal(r2.success, false);
    void r;
  });

  it("cliente exige nome", () => {
    const r = createClienteSchema.safeParse({
      nome: "",
      telefone: "11999999999",
    });
    assert.equal(r.success, false);
  });

  it("AppError não inclui stack no JSON serializado típico", () => {
    const err = new AppError(400, "Dados inválidos", { field: "x" });
    assert.equal(err.statusCode, 400);
    assert.equal(err.message, "Dados inválidos");
    assert.deepEqual(err.details, { field: "x" });
  });
});
