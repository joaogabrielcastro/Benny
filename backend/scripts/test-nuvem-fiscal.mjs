/**
 * Verifica OAuth2 (client_credentials) com a Nuvem Fiscal usando o .env do backend.
 * Uso: na pasta backend → npm run test-nuvem-fiscal
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { isNuvemFiscalConfigured, getNuvemFiscalConfig } = await import(
  "../src/config/nuvemFiscal.js"
);
const { testarConexao } = await import("../src/services/nuvemFiscalClient.js");

const ok = isNuvemFiscalConfigured();
const cfg = getNuvemFiscalConfig();
const cnpjMask =
  cfg.empresaCnpj.length === 14
    ? `${cfg.empresaCnpj.slice(0, 2)}.***.***/****-${cfg.empresaCnpj.slice(12)}`
    : "(ausente ou inválido)";

console.log("Nuvem Fiscal — teste de conexão (homologação/produção conforme .env)\n");
console.log("  OAuth configurado:", ok ? "sim" : "não");
console.log("  Ambiente:", cfg.ambiente);
console.log("  Provedor DPS:", cfg.provedor);
console.log("  CNPJ emitente:", cnpjMask);
console.log("  IBGE (prestação):", cfg.codigoMunicipioIbge || "(vazio)");
console.log("  cTribNac:", cfg.cTribNac);
console.log("  Auth URL:", cfg.authUrl);
console.log("  API base:", cfg.apiBaseUrl);

if (!ok) {
  console.error(
    "\nDefina NUVEM_FISCAL_CLIENT_ID, NUVEM_FISCAL_CLIENT_SECRET e NUVEM_FISCAL_CNPJ_EMITENTE no .env\n",
  );
  process.exit(1);
}

let tokenOk = false;
let tokenErro = "";
const r = await testarConexao();
tokenOk = r.ok;
if (!r.ok) tokenErro = String(r.motivo || "falha desconhecida");
console.log("\n  Token OAuth:", tokenOk ? "OK" : "falhou");
if (!tokenOk) {
  console.error("  Motivo:", tokenErro);
  console.error(
    "\n  invalid_client / Unknown client = o Client ID não existe no servidor de auth da Nuvem Fiscal.",
  );
  console.error("  Corrija assim:");
  console.error(
    "    1) Abra https://console.nuvemfiscal.com.br (mesma conta da empresa) → Credenciais de API → Criar credencial.",
  );
  console.error(
    "    2) Para testes, escolha tipo Sandbox; copie Client ID e Client Secret para o .env (o Secret só aparece uma vez).",
  );
  console.error(
    "    3) Se a credencial for Sandbox, defina também NUVEM_FISCAL_API_URL=https://api.sandbox.nuvemfiscal.com.br",
  );
  console.error(
    "    4) Confirme que NUVEM_FISCAL_CLIENT_ID não tem aspas, espaços nem quebra de linha no .env.\n",
  );
  process.exit(1);
}
console.log("\nPróximo passo: emitir NFS-e de teste pela OS no app (homologação).\n");
