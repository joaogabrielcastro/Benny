import { describe, it, expect } from "vitest";
import { mascaraCPF, mascaraCNPJ, mascaraTelefone, mascaraPlaca, removerMascara } from "./masks";
import { formatarMoeda } from "./formatters";

describe("masks", () => {
  it("mascaraCPF", () => {
    expect(mascaraCPF("52998224725")).toBe("529.982.247-25");
  });

  it("mascaraCNPJ", () => {
    expect(mascaraCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("mascaraTelefone celular", () => {
    const m = mascaraTelefone("11988887777");
    expect(m.replace(/\D/g, "")).toBe("11988887777");
    expect(m).toMatch(/\(/);
  });

  it("mascaraPlaca", () => {
    expect(mascaraPlaca("abc1d23").toUpperCase()).toContain("ABC");
  });

  it("removerMascara", () => {
    expect(removerMascara("529.982.247-25")).toBe("52998224725");
  });
});

describe("formatters", () => {
  it("formatarMoeda BRL", () => {
    const s = formatarMoeda(1500.5);
    expect(s).toMatch(/1\.500,50|R\$/);
  });

  it("formatarMoeda zero para inválido", () => {
    expect(formatarMoeda(null)).toMatch(/0/);
  });
});
