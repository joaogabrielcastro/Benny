import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  osJaReservouEstoque,
  produtoPendenteBaixaFinalizacao,
} from "../src/domain/estoqueOs.js";

describe("estoqueOs — regras de baixa na finalização", () => {
  it("não debita de novo item já marcado com baixa_estoque", () => {
    assert.equal(
      produtoPendenteBaixaFinalizacao({
        produto_id: 1,
        baixa_estoque: true,
        quantidade: 2,
      }),
      false,
    );
  });

  it("considera pendente quando baixa_estoque é false/null", () => {
    assert.equal(
      produtoPendenteBaixaFinalizacao({
        produto_id: 1,
        baixa_estoque: false,
        quantidade: 1,
      }),
      true,
    );
    assert.equal(
      produtoPendenteBaixaFinalizacao({
        produto_id: 1,
        baixa_estoque: null,
        quantidade: 1,
      }),
      true,
    );
  });

  it("ignora linhas sem produto_id", () => {
    assert.equal(
      produtoPendenteBaixaFinalizacao({
        produto_id: null,
        baixa_estoque: false,
      }),
      false,
    );
  });

  it("osJaReservouEstoque detecta reserva prévia (fluxo OS/orçamento)", () => {
    assert.equal(
      osJaReservouEstoque([
        { produto_id: 1, baixa_estoque: true, quantidade: 2 },
      ]),
      true,
    );
    assert.equal(
      osJaReservouEstoque([
        { produto_id: 1, baixa_estoque: false, quantidade: 2 },
      ]),
      false,
    );
    assert.equal(osJaReservouEstoque([]), false);
  });
});
