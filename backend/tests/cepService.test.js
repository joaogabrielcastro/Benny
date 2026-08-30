import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { AppError } from "../src/lib/AppError.js";

describe("cepService", () => {
  let getMock;
  let cepService;

  beforeEach(async () => {
    getMock = mock.method(axios, "get");
    // Reimporta o módulo para pegar o mock ativo (singleton já carregado usa axios mockado).
    ({ default: cepService } = await import("../src/services/cepService.js"));
  });

  afterEach(() => {
    getMock.mock.restore();
  });

  it("rejeita CEP com tamanho inválido (400)", async () => {
    await assert.rejects(
      () => cepService.buscarEnderecoPorCep("123"),
      (err) => err instanceof AppError && err.statusCode === 400,
    );
  });

  it("retorna endereço do ViaCEP quando encontrado", async () => {
    getMock.mock.mockImplementation(async () => ({
      data: {
        cep: "81020-670",
        logradouro: "Rua Emanuel Kant",
        complemento: "",
        bairro: "Capão Raso",
        localidade: "Curitiba",
        uf: "PR",
        ibge: "4106902",
      },
    }));

    const end = await cepService.buscarEnderecoPorCep("81020670");
    assert.equal(end.cidade, "Curitiba");
    assert.equal(end.estado, "PR");
    assert.equal(end.ibge, "4106902");
  });

  it("retorna 404 quando ViaCEP e BrasilAPI não encontram o CEP", async () => {
    getMock.mock.mockImplementation(async (url) => {
      if (String(url).includes("viacep")) {
        return { data: { erro: true } };
      }
      const err = new Error("Not Found");
      err.response = { status: 404 };
      throw err;
    });

    await assert.rejects(
      () => cepService.buscarEnderecoPorCep("83441660"),
      (err) =>
        err instanceof AppError &&
        err.statusCode === 404 &&
        /CEP não encontrado/i.test(err.message),
    );
  });

  it("usa BrasilAPI quando ViaCEP não encontra", async () => {
    getMock.mock.mockImplementation(async (url) => {
      if (String(url).includes("viacep")) {
        return { data: { erro: true } };
      }
      return {
        data: {
          cep: "01310100",
          street: "Avenida Paulista",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "SP",
          location: { ibge: { code: "3550308" } },
        },
      };
    });

    const end = await cepService.buscarEnderecoPorCep("01310-100");
    assert.equal(end.cidade, "São Paulo");
    assert.equal(end.logradouro, "Avenida Paulista");
    assert.equal(end.ibge, "3550308");
  });
});
