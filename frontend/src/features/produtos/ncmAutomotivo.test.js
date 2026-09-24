import { describe, it, expect } from "vitest";
import { buscarNcmAutomotivo } from "./ncmAutomotivo";

describe("busca de NCM automotivo", () => {
  it("encontra pastilha sem exigir os 8 dígitos", () => {
    const lista = buscarNcmAutomotivo("pastilha");
    expect(lista.some((item) => item.ncm === "87083090")).toBe(true);
  });

  it("não devolve lista com um caractere", () => {
    expect(buscarNcmAutomotivo("p")).toEqual([]);
  });

  it("aceita acento em óleo", () => {
    expect(buscarNcmAutomotivo("óleo").some((item) => item.ncm === "27101932")).toBe(true);
  });
});
