import { describe, it, expect } from "vitest";
import {
  validarCPF,
  validarCNPJ,
  validarPlaca,
  validarEmail,
  validarTelefone,
  validarObrigatorio,
  validarChassi,
  validarCPFouCNPJ,
} from "./validators";

describe("validators", () => {
  it("validarCPF", () => {
    expect(validarCPF("")).toBe(true);
    expect(validarCPF("11111111111")).toBe(false);
    expect(validarCPF("529.982.247-25")).toBe(true);
    expect(validarCPF("123")).toBe(false);
  });

  it("validarCNPJ", () => {
    expect(validarCNPJ("")).toBe(true);
    expect(validarCNPJ("00000000000000")).toBe(false);
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("validarCPFouCNPJ", () => {
    expect(validarCPFouCNPJ("52998224725")).toBe(true);
    expect(validarCPFouCNPJ("11222333000181")).toBe(true);
    expect(validarCPFouCNPJ("12345")).toBe(false);
  });

  it("validarPlaca antiga e Mercosul", () => {
    expect(validarPlaca("ABC1234")).toBe(true);
    expect(validarPlaca("ABC1D23")).toBe(true);
    expect(validarPlaca("ABC-1234")).toBe(true);
    expect(validarPlaca("XX")).toBe(false);
    expect(validarPlaca("")).toBe(false);
  });

  it("validarEmail / telefone / obrigatorio", () => {
    expect(validarEmail("a@b.com")).toBe(true);
    expect(validarEmail("x")).toBe(false);
    expect(validarTelefone("(11) 98888-7777")).toBe(true);
    expect(validarTelefone("123")).toBe(false);
    expect(validarObrigatorio("  ")).toBe(false);
    expect(validarObrigatorio("ok")).toBe(true);
  });

  it("validarChassi", () => {
    expect(validarChassi("")).toBe(true);
    expect(validarChassi("1HGBH41JXMN109186")).toBe(true);
    expect(validarChassi("SHORT")).toBe(false);
    expect(validarChassi("1HGBH41JXIN109186")).toBe(false); // contém I
  });
});
