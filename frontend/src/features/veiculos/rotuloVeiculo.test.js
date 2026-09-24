import { describe, it, expect } from "vitest";
import { rotuloVeiculo } from "./rotuloVeiculo";

describe("rotuloVeiculo", () => {
  it("inclui versão e motor quando existem", () => {
    expect(rotuloVeiculo({
      marca: "Volkswagen",
      modelo: "Jetta",
      versao: "Comfortline",
      motor: "2.0 TSI",
      ano: 2016,
      placa: "ABC1D23",
    })).toBe("Volkswagen Jetta Comfortline 2.0 TSI 2016 - ABC1D23");
  });

  it("mantém o rótulo curto quando os campos novos estão vazios", () => {
    expect(rotuloVeiculo({
      marca: "Volkswagen",
      modelo: "Jetta",
      ano: 2016,
      placa: "ABC1D23",
    })).toBe("Volkswagen Jetta 2016 - ABC1D23");
  });
});
