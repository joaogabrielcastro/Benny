import { describe, it, expect } from "vitest";
import { aplicarSugestoesNoOrcamento } from "./aplicarSugestoes";

describe("aplicarSugestoesNoOrcamento", () => {
  it("copia preço do cadastro e calcula o total da linha", () => {
    const r = aplicarSugestoesNoOrcamento({
      itensProdutos: [],
      itensServicos: [],
      selecionados: [
        {
          tipo: "produto",
          quantidade_sugerida: 2,
          produto: { id: 45, codigo: "P-0045", nome: "Aditivo G13 1L", valor_unitario: 42 },
        },
        {
          tipo: "servico",
          quantidade_sugerida: 1,
          servico: { codigo: "S-0014", nome: "Inspeção", valor_unitario: 180 },
        },
      ],
    });
    expect(r.itensProdutos[0]).toMatchObject({
      produto_id: 45,
      valor_unitario: 42,
      valor_total: 84,
      quantidade: 2,
    });
    expect(r.itensServicos[0].valor_total).toBe(180);
  });

  it("não duplica o mesmo produto_id nem o mesmo código de serviço", () => {
    const r = aplicarSugestoesNoOrcamento({
      itensProdutos: [{ produto_id: 45, codigo: "P-0045", descricao: "Aditivo", quantidade: 1, valor_unitario: 42, valor_total: 42 }],
      itensServicos: [{ codigo: "S-0014", descricao: "Inspeção", quantidade: 1, valor_unitario: 180, valor_total: 180 }],
      selecionados: [
        { tipo: "produto", quantidade_sugerida: 2, produto: { id: 45, nome: "Aditivo G13 1L", valor_unitario: 42 } },
        { tipo: "servico", quantidade_sugerida: 1, servico: { codigo: "S-0014", nome: "Inspeção", valor_unitario: 180 } },
      ],
    });
    expect(r.itensProdutos).toHaveLength(1);
    expect(r.itensProdutos[0].quantidade).toBe(1);
    expect(r.itensServicos).toHaveLength(1);
    expect(r.avisos.length).toBe(2);
  });
});
