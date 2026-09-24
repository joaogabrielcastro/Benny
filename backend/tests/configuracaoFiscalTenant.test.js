import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  configFiscalDe,
  mesclarRegimeFiscal,
  resolverCfopOperacao,
  validarConfigFiscal,
} from "../src/domain/configuracaoFiscalTenant.js";
import { requireRole } from "../src/middleware/requireRole.js";
import { ROLES } from "../src/config/roles.js";
import { montarCorpoEmissaoNfe } from "../src/services/nuvemFiscalNfePayload.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const chaves = [
  "NOTAAS_NFE_CRT",
  "ACBR_API_NFE_CRT",
  "NUVEM_FISCAL_NFE_CRT",
];

function semEnv(fn) {
  const antes = Object.fromEntries(chaves.map((k) => [k, process.env[k]]));
  for (const k of chaves) delete process.env[k];
  try {
    return fn();
  } finally {
    for (const k of chaves) {
      if (antes[k] === undefined) delete process.env[k];
      else process.env[k] = antes[k];
    }
  }
}

const cliente = {
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

test("tenant sem regime bloqueia, inclusive com ENV, quando multi-tenant", () => {
  semEnv(() => {
    process.env.NOTAAS_NFE_CRT = "1";
    const r = validarConfigFiscal({}, { singleTenant: false });
    assert.equal(r.ok, false);
    assert.equal(r.code, "NFE_CONFIGURACAO_FISCAL_INCOMPLETA");
    assert.equal(r.campos[0].campo, "regime_tributario");
  });
});

test("single-tenant usa CRT explícito do ENV", () => {
  semEnv(() => {
    process.env.NOTAAS_NFE_CRT = "3";
    const config = configFiscalDe({}, { singleTenant: true });
    assert.equal(config.crt, 3);
    assert.equal(config.regimeTributario, "REGIME_NORMAL");
    assert.equal(config.origem, "env_legado");
  });
});

test("ENV vazio não vira CRT 1", () => {
  semEnv(() => {
    assert.equal(configFiscalDe({}, { singleTenant: true }), null);
  });
});

test("tenant A não herda regime do tenant B", () => {
  const a = mesclarRegimeFiscal({ fiscal: { brasil_nfe: { token_env: "TOK_A" } } }, "SIMPLES_NACIONAL", "102");
  const b = mesclarRegimeFiscal({ fiscal: { brasil_nfe: { token_env: "TOK_B" } } }, "REGIME_NORMAL", "40");
  assert.equal(configFiscalDe(a, { singleTenant: false }).crt, 1);
  assert.equal(configFiscalDe(b, { singleTenant: false }).crt, 3);
  assert.equal(a.fiscal.brasil_nfe.token_env, "TOK_A");
  assert.equal(b.fiscal.brasil_nfe.token_env, "TOK_B");
});

test("atualizar A não altera o objeto de B", () => {
  const a = mesclarRegimeFiscal({}, "SIMPLES_NACIONAL", "102");
  const b = mesclarRegimeFiscal({}, "REGIME_NORMAL", "41");
  const a2 = mesclarRegimeFiscal(a, "SIMPLES_NACIONAL_EXCESSO", "40");
  assert.equal(a2.fiscal.crt, 2);
  assert.equal(a2.fiscal.icms.tipo, "CST");
  assert.equal(b.fiscal.crt, 3);
  assert.equal(b.fiscal.icms.codigo_padrao, "41");
});

test("regime do tenant vence o ENV", () => {
  semEnv(() => {
    process.env.NOTAAS_NFE_CRT = "3";
    const config = configFiscalDe(
      { fiscal: { regime_tributario: "SIMPLES_NACIONAL" } },
      { singleTenant: true },
    );
    assert.equal(config.crt, 1);
    assert.equal(config.origem, "tenant");
  });
});

test("não admin não altera regime", () => {
  const admin = requireRole(ROLES.ADMIN);
  let status = 0;
  admin({ user: { role: "mecanico" } }, {}, (err) => {
    status = err?.statusCode || 0;
  });
  assert.equal(status, 403);
});

test("configuração fiscal vem depois do destinatário e antes da numeração", () => {
  const src = readFileSync(
    join(root, "src/services/notasFiscais/notasFiscaisEmitir.js"),
    "utf8",
  );
  const dest = src.indexOf("validarDestinatarioNfe");
  const fiscal = src.indexOf("validarConfigFiscalTenant");
  const numero = src.indexOf("reservarProximoNumeroNfe");
  const emitir = src.indexOf("provider.emitir");
  assert.ok(dest >= 0 && fiscal > dest && numero > fiscal && emitir > numero);
});

test("CRT não vai no corpo da NF-e", () => {
  const result = montarCorpoEmissaoNfe(
    { id: 1 },
    cliente,
    [{ descricao: "Peca", quantidade: 1, valor_unitario: 10, valor_total: 10, produto_id: 1, ncm: "87089990" }],
    { nNF: 1, referencia: "b-1-os1-nfe", configFiscal: { icms: { tipo: "CSOSN", codigo: "102" }, cfopResolvido: "5102" }, consumidorFinal: true },
  );
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result.body).includes('"CRT"'), false);
  assert.equal(result.body.ConsumidorFinal, true);
  assert.equal(result.body.Produtos[0].Imposto.ICMS.CodSituacaoTributaria, "102");
  assert.equal(result.body.Produtos[0].CFOP, 5102);
});

function emitir(configFiscal) {
  return montarCorpoEmissaoNfe(
    { id: 1 },
    cliente,
    [{ descricao: "Peca", quantidade: 1, valor_unitario: 10, valor_total: 10, produto_id: 1, ncm: "87089990" }],
    { nNF: 1, referencia: "b-1-os1-nfe", configFiscal, consumidorFinal: configFiscal.consumidorFinal ?? true },
  );
}

const op = { uf: "PR", vendaInterna: "5102", vendaInterestadual: "6102" };

test("Simples envia o CSOSN do tenant e não um CST", () => {
  const salvo = mesclarRegimeFiscal({}, "SIMPLES_NACIONAL", "400");
  const fiscal = validarConfigFiscal(salvo, { singleTenant: false });
  const result = emitir({ ...fiscal.config, cfopResolvido: "5102" });
  assert.equal(result.ok, true);
  assert.equal(result.body.Produtos[0].Imposto.ICMS.CodSituacaoTributaria, "400");
  assert.equal(fiscal.config.icms.tipo, "CSOSN");
});

test("Regime Normal envia o CST do tenant", () => {
  const salvo = mesclarRegimeFiscal({}, "REGIME_NORMAL", "41");
  const fiscal = validarConfigFiscal(salvo, { singleTenant: false });
  const result = emitir({ ...fiscal.config, cfopResolvido: "5405" });
  assert.equal(result.ok, true);
  assert.equal(result.body.Produtos[0].Imposto.ICMS.CodSituacaoTributaria, "41");
  assert.equal(fiscal.config.icms.tipo, "CST");
});

test("CRT 3 com CSOSN bloqueia", () => {
  const r = validarConfigFiscal(
    { fiscal: { regime_tributario: "REGIME_NORMAL", crt: 3, icms: { tipo: "CSOSN", codigo_padrao: "102" } } },
    { singleTenant: false },
  );
  assert.equal(r.ok, false);
  assert.equal(r.code, "NFE_CONFIGURACAO_FISCAL_INCOMPLETA");
});

test("regime sem situação tributária bloqueia", () => {
  const r = validarConfigFiscal(
    { fiscal: { regime_tributario: "SIMPLES_NACIONAL", crt: 1 } },
    { singleTenant: false },
  );
  assert.equal(r.ok, false);
  assert.equal(r.campos[0].campo, "icms");
});

test("MEI aceita 102 e recusa 103 e 101", () => {
  const ok = mesclarRegimeFiscal({}, "MEI", "102");
  assert.equal(ok.fiscal.crt, 4);
  assert.equal(ok.fiscal.icms.tipo, "CSOSN");
  assert.throws(() => mesclarRegimeFiscal({}, "MEI", "103"), /N12a-80/);
  assert.throws(() => mesclarRegimeFiscal({}, "MEI", "101"), /N12a-80|exige/);
  const simples = mesclarRegimeFiscal({}, "SIMPLES_NACIONAL", "102");
  assert.equal(simples.fiscal.regime_tributario, "SIMPLES_NACIONAL");
});

test("multi-tenant não completa CSOSN pelo ENV", () => {
  semEnv(() => {
    process.env.NOTAAS_NFE_CSOSN = "102";
    process.env.NOTAAS_NFE_CRT = "1";
    const r = validarConfigFiscal(
      { fiscal: { regime_tributario: "SIMPLES_NACIONAL" } },
      { singleTenant: false },
    );
    assert.equal(r.ok, false);
  });
});

test("tenant A CSOSN não entra no payload do tenant B", () => {
  const a = validarConfigFiscal(mesclarRegimeFiscal({}, "SIMPLES_NACIONAL", "300"), { singleTenant: false });
  const b = validarConfigFiscal(mesclarRegimeFiscal({}, "REGIME_NORMAL", "40"), { singleTenant: false });
  assert.equal(emitir({ ...a.config, cfopResolvido: "5102" }).body.Produtos[0].Imposto.ICMS.CodSituacaoTributaria, "300");
  assert.equal(emitir({ ...b.config, cfopResolvido: "5405" }).body.Produtos[0].Imposto.ICMS.CodSituacaoTributaria, "40");
});

test("mesma UF usa o CFOP interno do tenant", () => {
  const salvo = mesclarRegimeFiscal({}, "SIMPLES_NACIONAL", "102", { uf: "PR", vendaInterna: "5405", vendaInterestadual: "6404" });
  const config = configFiscalDe(salvo, { singleTenant: false });
  const r = resolverCfopOperacao(config, "PR");
  assert.equal(r.cfop, "5405");
  assert.equal(emitir({ ...config, cfopResolvido: r.cfop }).body.Produtos[0].CFOP, 5405);
});

test("outra UF usa o CFOP interestadual do tenant", () => {
  const salvo = mesclarRegimeFiscal({}, "SIMPLES_NACIONAL", "102", { uf: "PR", vendaInterna: "5405", vendaInterestadual: "6404" });
  const r = resolverCfopOperacao(configFiscalDe(salvo, { singleTenant: false }), "SC");
  assert.equal(r.cfop, "6404");
});

test("sem CFOP bloqueia e multi-tenant ignora ENV", () => {
  semEnv(() => {
    process.env.NOTAAS_NFE_CFOP = "5102";
    const config = configFiscalDe(
      { fiscal: { regime_tributario: "SIMPLES_NACIONAL", crt: 1, icms: { tipo: "CSOSN", codigo_padrao: "102" } } },
      { singleTenant: false },
    );
    const r = resolverCfopOperacao(config, "PR");
    assert.equal(r.ok, false);
    assert.equal(r.code, "NFE_CONFIGURACAO_FISCAL_INCOMPLETA");
  });
});

test("MEI 102 só aceita 5102 e 6102", () => {
  assert.equal(resolverCfopOperacao(configFiscalDe(mesclarRegimeFiscal({}, "MEI", "102", op), { singleTenant: false }), "PR").cfop, "5102");
  assert.throws(() => mesclarRegimeFiscal({}, "MEI", "102", { uf: "PR", vendaInterna: "5405", vendaInterestadual: "6102" }), /N12a-90/);
});

test("MEI 900 aceita 5202 e recusa 5102", () => {
  const ok = mesclarRegimeFiscal({}, "MEI", "900", { uf: "PR", vendaInterna: "5202", vendaInterestadual: "6202" });
  assert.equal(resolverCfopOperacao(configFiscalDe(ok, { singleTenant: false }), "PR").cfop, "5202");
  assert.throws(() => mesclarRegimeFiscal({}, "MEI", "900", op), /N12a-90/);
});

test("tenants não cruzam CFOP", () => {
  const a = configFiscalDe(mesclarRegimeFiscal({}, "SIMPLES_NACIONAL", "102", { uf: "PR", vendaInterna: "5102", vendaInterestadual: "6102" }), { singleTenant: false });
  const b = configFiscalDe(mesclarRegimeFiscal({}, "REGIME_NORMAL", "40", { uf: "SP", vendaInterna: "5101", vendaInterestadual: "6101" }), { singleTenant: false });
  assert.equal(resolverCfopOperacao(a, "PR").cfop, "5102");
  assert.equal(resolverCfopOperacao(b, "SP").cfop, "5101");
  assert.equal(resolverCfopOperacao(b, "RJ").cfop, "6101");
});
