import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ZodError } from "zod";
import { createProdutoSchema } from "../src/schemas/produtoSchemas.js";
import { montarCorpoEmissaoNfe } from "../src/services/nuvemFiscalNfePayload.js";

const clienteOk = {
  nome: "Cliente Teste",
  cep: "83411100",
  cpf_cnpj: "12345678909",
  cidade: "Colombo",
  estado: "PR",
  codigo_ibge: "4105805",
  situacao_icms: "NAO_CONTRIBUINTE",
  endereco: "Rua A",
  numero: "100",
  bairro: "Centro",
};

describe("NCM no cadastro", () => {
  it("normaliza 8708.30.90 para 87083090", () => {
    const parsed = createProdutoSchema.parse({
      nome: "Pastilha",
      ncm: "8708.30.90",
    });
    assert.equal(parsed.ncm, "87083090");
  });

  it("aceita cadastro sem NCM", () => {
    const parsed = createProdutoSchema.parse({ nome: "Consumível" });
    assert.equal(parsed.ncm, null);
  });

  it("rejeita NCM informado inválido", () => {
    for (const ncm of ["123", "ABCDEFGH", "123456789"]) {
      assert.throws(
        () => createProdutoSchema.parse({ nome: "Peca", ncm }),
        ZodError,
      );
    }
  });

  it("criar e atualizar incluem ncm e tenant_id no SQL", () => {
    const src = readFileSync(
      new URL("../src/services/produtosService.js", import.meta.url),
      "utf8",
    );
    assert.match(
      src,
      /INSERT INTO produtos \(codigo, nome, descricao, quantidade, valor_custo, valor_venda, estoque_minimo, ncm, tenant_id\)/,
    );
    assert.match(src, /ncm = \$8/);
    assert.match(src, /WHERE id = \$9 AND tenant_id = \$10/);
  });
});

describe("NCM na NF-e", () => {
  it("envia o NCM real do produto", () => {
    process.env.NOTAAS_NFE_NCM = "87089990";
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-100" },
      clienteOk,
      [
        {
          produto_id: 25,
          codigo: "P-0012",
          descricao: "Pastilha de freio",
          quantidade: 1,
          valor_unitario: 10,
          valor_total: 10,
          ncm: "87083090",
        },
      ],
      { nNF: 1, referencia: "b-1-os1-nfe", configFiscal: { icms: { tipo: "CSOSN", codigo: "102" }, cfopResolvido: "5102" }, consumidorFinal: true },
    );
    assert.equal(result.ok, true);
    assert.equal(result.body.Produtos[0].NCM, "87083090");
  });

  it("não usa NOTAAS_NFE_NCM e não monta corpo para a Brasil NFe", () => {
    process.env.NOTAAS_NFE_NCM = "87089990";
    const result = montarCorpoEmissaoNfe(
      { id: 10, numero: "OS-10" },
      clienteOk,
      [
        {
          produto_id: 25,
          codigo: "P-0012",
          descricao: "Pastilha de freio",
          quantidade: 1,
          valor_unitario: 10,
          valor_total: 10,
          ncm: null,
        },
      ],
      { nNF: 8, referencia: "b-2-os10-nfe" },
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "NFE_PRODUTO_SEM_NCM");
    assert.equal(result.produtos.length, 1);
    assert.equal(result.produtos[0].descricao, "Pastilha de freio");
    assert.equal(result.body, undefined);
    assert.equal(JSON.stringify(result).includes("87089990"), false);
    const emitir = readFileSync(
      new URL("../src/services/notasFiscais/notasFiscaisEmitir.js", import.meta.url),
      "utf8",
    );
    const bloqueio = emitir.indexOf("avaliarNcmItensNfe");
    const http = emitir.indexOf("provider.emitir");
    assert.ok(bloqueio > 0 && bloqueio < http);
  });

  it("lista todos os itens inválidos e esconde produto de outro tenant", () => {
    process.env.NOTAAS_NFE_NCM = "87089990";
    const result = montarCorpoEmissaoNfe(
      { id: 1, numero: "OS-1" },
      clienteOk,
      [
        {
          produto_id: 1,
          produto_do_tenant: 1,
          codigo: "A",
          descricao: "Filtro",
          quantidade: 1,
          valor_total: 10,
          ncm: "87083090",
        },
        {
          produto_id: 2,
          produto_do_tenant: 2,
          codigo: "B",
          descricao: "Disco dianteiro",
          quantidade: 1,
          valor_total: 20,
          ncm: null,
        },
        {
          produto_id: 3,
          produto_do_tenant: 3,
          codigo: "C",
          descricao: "Amortecedor",
          quantidade: 1,
          valor_total: 30,
          ncm: "123",
        },
        {
          produto_id: 99,
          produto_do_tenant: null,
          codigo: "X",
          descricao: "Produto do outro tenant",
          quantidade: 1,
          valor_total: 5,
        },
      ],
      { nNF: 1 },
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "NFE_PRODUTO_SEM_NCM");
    assert.deepEqual(
      result.produtos.map((p) => p.descricao),
      ["Disco dianteiro", "Amortecedor", "Produto do outro tenant"],
    );
    assert.equal(
      result.produtos.some((p) => p.produto_id === 99),
      false,
    );
    assert.equal(result.body, undefined);
  });
});
