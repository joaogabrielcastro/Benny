import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createAgendamentoSchema,
  updateAgendamentoSchema,
} from "../src/schemas/agendamentoSchemas.js";
import {
  createContaPagarSchema,
  updateContaPagarSchema,
} from "../src/schemas/contaPagarSchemas.js";
import { loginSchema } from "../src/schemas/authSchemas.js";
import { idParamSchema, osIdParamSchema } from "../src/schemas/commonSchemas.js";
import { cancelarNotaFiscalSchema } from "../src/schemas/notaFiscalSchemas.js";

describe("agendamentoSchemas", () => {
  const base = {
    cliente_id: 1,
    data_agendamento: "2026-08-05",
    hora_inicio: "09:00",
    tipo_servico: "Revisão",
  };

  it("aceita criação válida", () => {
    const parsed = createAgendamentoSchema.parse(base);
    assert.equal(parsed.cliente_id, 1);
    assert.equal(parsed.tipo_servico, "Revisão");
  });

  it("rejeita sem cliente", () => {
    const r = createAgendamentoSchema.safeParse({
      ...base,
      cliente_id: undefined,
    });
    assert.equal(r.success, false);
  });

  it("update aceita status Em Andamento", () => {
    const parsed = updateAgendamentoSchema.parse({
      status: "Em Andamento",
    });
    assert.equal(parsed.status, "Em Andamento");
  });

  it("update rejeita status inválido", () => {
    const r = updateAgendamentoSchema.safeParse({ status: "XYZ" });
    assert.equal(r.success, false);
  });
});

describe("contaPagarSchemas", () => {
  const base = {
    descricao: "Aluguel",
    categoria: "Fixo",
    valor: 1500.5,
    data_vencimento: "2026-08-10",
  };

  it("aceita criação válida", () => {
    const parsed = createContaPagarSchema.parse(base);
    assert.equal(parsed.valor, 1500.5);
  });

  it("rejeita valor zero/negativo", () => {
    assert.equal(
      createContaPagarSchema.safeParse({ ...base, valor: 0 }).success,
      false,
    );
    assert.equal(
      createContaPagarSchema.safeParse({ ...base, valor: -1 }).success,
      false,
    );
  });

  it("update marca como Pago", () => {
    const parsed = updateContaPagarSchema.parse({
      status: "Pago",
      data_pagamento: "2026-08-05",
    });
    assert.equal(parsed.status, "Pago");
  });
});

describe("auth e common schemas", () => {
  it("loginSchema exige email e senha", () => {
    assert.equal(loginSchema.safeParse({ email: "x", senha: "1" }).success, false);
    assert.equal(
      loginSchema.safeParse({ email: "a@b.com", senha: "" }).success,
      false,
    );
    assert.equal(
      loginSchema.safeParse({ email: "a@b.com", senha: "secret" }).success,
      true,
    );
  });

  it("idParamSchema coerces string", () => {
    assert.equal(idParamSchema.parse({ id: "42" }).id, 42);
    assert.equal(osIdParamSchema.parse({ osId: "7" }).osId, 7);
    assert.equal(idParamSchema.safeParse({ id: "abc" }).success, false);
  });

  it("cancelarNotaFiscalSchema aceita motivo opcional", () => {
    assert.equal(cancelarNotaFiscalSchema.safeParse({}).success, true);
    assert.equal(
      cancelarNotaFiscalSchema.safeParse({ motivo: "curto" }).success,
      false,
    );
    assert.equal(
      cancelarNotaFiscalSchema.safeParse({
        motivo: "Cancelamento solicitado pelo cliente",
      }).success,
      true,
    );
  });
});
