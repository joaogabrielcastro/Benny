import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarConsumidorFinalOperacao } from "../src/domain/operacaoFiscalNfe.js";
import { montarCorpoEmissaoNfe } from "../src/services/nuvemFiscalNfePayload.js";

const cliente = (extra = {}) => ({
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
  ...extra,
});

const produto = [{ descricao: "Peca", quantidade: 1, valor_unitario: 10, valor_total: 10, produto_id: 1, ncm: "87089990" }];

function emitir(consumidorFinal, extraCliente = {}, ufEmitente = "PR") {
  return montarCorpoEmissaoNfe(
    { id: 1 },
    cliente(extraCliente),
    produto,
    {
      nNF: 1,
      referencia: "b-1-os1-nfe",
      consumidorFinal,
      configFiscal: { icms: { tipo: "CSOSN", codigo: "102" }, cfopResolvido: "5102", ufEmitente },
    },
  );
}

test("ausente bloqueia sem corpo", () => {
  const r = validarConsumidorFinalOperacao({ consumidorFinal: null });
  assert.equal(r.code, "NFE_OPERACAO_FISCAL_INCOMPLETA");
  assert.equal(emitir(null).ok, false);
  assert.equal(emitir(undefined).body, undefined);
});

test("sim e não chegam distintos ao payload", () => {
  assert.equal(emitir(true).body.ConsumidorFinal, true);
  assert.equal(emitir(false).body.ConsumidorFinal, false);
});

test("CPF com false e CNPJ com true não são invertidos", () => {
  assert.equal(emitir(false, { cpf_cnpj: "12345678909" }).body.ConsumidorFinal, false);
  assert.equal(emitir(true, { cpf_cnpj: "11222333000181" }).body.ConsumidorFinal, true);
});

test("não contribuinte com false permanece false", () => {
  const r = emitir(false, { situacao_icms: "NAO_CONTRIBUINTE" });
  assert.equal(r.body.ConsumidorFinal, false);
  assert.equal(r.body.Cliente.IndicadorIe, 9);
});

test("interna com consumidor final não exige ICMS da UF de destino", () => {
  const r = emitir(true, { estado: "PR" }, "PR");
  assert.equal(r.ok, true);
  assert.equal(r.body.ConsumidorFinal, true);
});

test("interestadual, final e não contribuinte bloqueia DIFAL", () => {
  const r = emitir(true, { estado: "SC" }, "PR");
  assert.equal(r.ok, false);
  assert.equal(r.code, "NFE_ICMS_UF_DESTINO_NAO_CONFIGURADO");
  assert.equal(r.body, undefined);
});

test("interestadual sem consumidor final não cai na NA01-20", () => {
  assert.equal(emitir(false, { estado: "SC" }, "PR").body.ConsumidorFinal, false);
});

test("interestadual final contribuinte não cai na condição do indicador 9", () => {
  const r = emitir(true, { estado: "SC", situacao_icms: "CONTRIBUINTE_ICMS", inscricao_estadual: "1234567890" }, "PR");
  assert.equal(r.ok, true);
  assert.equal(r.body.Cliente.IndicadorIe, 1);
  assert.equal(r.body.ConsumidorFinal, true);
});

test("consumidor final vem depois do CFOP e antes da numeração", () => {
  const src = readFileSync(new URL("../src/services/notasFiscais/notasFiscaisEmitir.js", import.meta.url), "utf8");
  const cfop = src.indexOf("resolverCfopOperacao");
  const final = src.indexOf("validarConsumidorFinalOperacao");
  const numero = src.indexOf("reservarProximoNumeroNfe");
  assert.ok(cfop >= 0 && final > cfop && numero > final);
});
