/**
 * Smoke test Notaas — valida NOTAAS_API_KEY sem emitir nota.
 * Uso: na pasta backend → npm run test-notaas
 */
import "dotenv/config";
import {
  getNuvemFiscalConfig,
  isNuvemFiscalConfigured,
  PROVEDOR_FISCAL_LABEL,
} from "../src/config/nuvemFiscal.js";
import { testarConexao } from "../src/services/nuvemFiscalClient.js";

const cfg = getNuvemFiscalConfig();

console.log(`Provedor: ${PROVEDOR_FISCAL_LABEL} (${cfg.provedorId})`);
console.log(`API URL:  ${cfg.apiBaseUrl}`);
console.log(
  `API Key:  ${cfg.apiKey ? `${cfg.apiKey.slice(0, 10)}… (${cfg.apiKey.length} chars)` : "(vazia)"}`,
);
console.log(`CNPJ:     ${cfg.empresaCnpj || "(não definido)"}`);
console.log(`Ambiente: ${cfg.ambiente}`);
console.log(`cTribNac: ${cfg.cTribNac} | IBGE: ${cfg.codigoMunicipioIbge || "(vazio)"}`);

if (!isNuvemFiscalConfigured()) {
  console.error(
    "\nDefina NOTAAS_API_KEY no .env (prefixo ntaas_). Dashboard → API Keys.\n",
  );
  process.exit(1);
}

const result = await testarConexao();
if (!result.ok) {
  console.error("\nFalha na autenticação Notaas:");
  console.error(`  ${result.motivo}`);
  process.exit(1);
}

console.log("\nOK — API Key aceita pela Notaas.");
if (result.httpStatus != null) {
  console.log(`  (probe HTTP ${result.httpStatus} — esperado 404 em invoice fictício)`);
}
process.exit(0);
