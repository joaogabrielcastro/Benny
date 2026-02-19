/**
 * Script para validar se os services foram migrados para multi-tenant
 * 
 * Uso: node validate-multi-tenant.js
 * 
 * Este script analisa os services e verifica:
 * - Se os métodos recebem tenantId como parâmetro
 * - Se as queries incluem tenant_id
 * - Gera relatório de progresso
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICES_DIR = path.join(__dirname, "src", "services");

// Padrões a verificar
const PATTERNS = {
  hasTenantIdParam: /\basync\s+\w+\s*\([^)]*tenantId[^)]*\)/g,
  hasWhereTenantId: /WHERE[^;]*tenant_id\s*=/gi,
  hasInsertTenantId: /INSERT\s+INTO[^(]*\([^)]*tenant_id[^)]*\)/gi,
};

function analyzeService(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);

  // Ignorar arquivos exemplo
  if (fileName.includes("EXAMPLE") || fileName.includes("tenantsService")) {
    return null;
  }

  // Contar métodos
  const methodMatches = content.match(/async\s+\w+\s*\(/g) || [];
  const totalMethods = methodMatches.length;

  if (totalMethods === 0) return null;

  // Contar métodos com tenantId
  const tenantIdMethods =
    content.match(PATTERNS.hasTenantIdParam)?.length || 0;

  // Verificar queries com WHERE tenant_id
  const whereWithTenant = content.match(PATTERNS.hasWhereTenantId)?.length || 0;

  // Verificar INSERTs com tenant_id
  const insertsWithTenant =
    content.match(PATTERNS.hasInsertTenantId)?.length || 0;

  // Calcular score (0-100)
  const methodsScore = totalMethods > 0 ? (tenantIdMethods / totalMethods) * 100 : 0;

  // Determinar status
  let status = "❌ Não migrado";
  let emoji = "❌";

  if (methodsScore >= 80) {
    status = "✅ Migrado";
    emoji = "✅";
  } else if (methodsScore >= 50) {
    status = "⚠️ Parcialmente migrado";
    emoji = "⚠️";
  } else if (methodsScore > 0) {
    status = "🔄 Em progresso";
    emoji = "🔄";
  }

  return {
    fileName,
    status,
    emoji,
    totalMethods,
    tenantIdMethods,
    whereWithTenant,
    insertsWithTenant,
    score: Math.round(methodsScore),
  };
}

function generateReport() {
  console.log("🔍 Analisando services para Multi-Tenant...\n");

  const files = fs
    .readdirSync(SERVICES_DIR)
    .filter((f) => f.endsWith(".js"))
    .map((f) => path.join(SERVICES_DIR, f));

  const results = files
    .map((f) => analyzeService(f))
    .filter((r) => r !== null);

  // Ordenar por score (menor primeiro)
  results.sort((a, b) => a.score - b.score);

  // Imprimir relatório
  console.log("📊 RELATÓRIO DE MIGRAÇÃO MULTI-TENANT\n");
  console.log(
    "┌─────────────────────────────────────┬────────┬──────────┬──────────┬─────────┐",
  );
  console.log(
    "│ Service                             │ Status │ Métodos  │ WHERE    │ Score   │",
  );
  console.log(
    "├─────────────────────────────────────┼────────┼──────────┼──────────┼─────────┤",
  );

  results.forEach((r) => {
    const name = r.fileName.padEnd(35).substring(0, 35);
    const methods = `${r.tenantIdMethods}/${r.totalMethods}`.padEnd(8);
    const wheres = `${r.whereWithTenant}`.padEnd(8);
    const score = `${r.score}%`.padEnd(7);

    console.log(
      `│ ${name} │ ${r.emoji}      │ ${methods} │ ${wheres} │ ${score} │`,
    );
  });

  console.log(
    "└─────────────────────────────────────┴────────┴──────────┴──────────┴─────────┘",
  );

  // Estatísticas gerais
  const totalServices = results.length;
  const migrated = results.filter((r) => r.score >= 80).length;
  const partial = results.filter((r) => r.score >= 50 && r.score < 80).length;
  const notMigrated = results.filter((r) => r.score < 50).length;

  const avgScore =
    results.reduce((sum, r) => sum + r.score, 0) / totalServices || 0;

  console.log("\n📈 ESTATÍSTICAS:\n");
  console.log(`Total de services: ${totalServices}`);
  console.log(`✅ Migrados (>80%): ${migrated}`);
  console.log(`⚠️  Parciais (50-80%): ${partial}`);
  console.log(`❌ Não migrados (<50%): ${notMigrated}`);
  console.log(`📊 Score médio: ${Math.round(avgScore)}%`);

  // Progresso visual
  const progress = Math.round((migrated / totalServices) * 100);
  const barLength = 30;
  const filled = Math.round((progress / 100) * barLength);
  const empty = barLength - filled;

  console.log(
    `\n🎯 Progresso: [${"█".repeat(filled)}${"░".repeat(empty)}] ${progress}%`,
  );

  // Próximas ações
  console.log("\n🚀 PRÓXIMOS PASSOS:\n");

  const pending = results.filter((r) => r.score < 80);
  if (pending.length > 0) {
    console.log("Services que precisam ser migrados:\n");
    pending.slice(0, 5).forEach((r, i) => {
      console.log(
        `${i + 1}. ${r.fileName} (${r.score}%) - ${r.tenantIdMethods}/${r.totalMethods} métodos migrados`,
      );
    });

    if (pending.length > 5) {
      console.log(`... e mais ${pending.length - 5} services`);
    }
  } else {
    console.log("🎉 Todos os services foram migrados para multi-tenant!");
  }

  console.log("\n💡 Use os arquivos .EXAMPLE como referência para migração.");
  console.log(
    "📖 Consulte IMPLEMENTATION_CHECKLIST.md para guia completo.\n",
  );
}

try {
  generateReport();
} catch (error) {
  console.error("❌ Erro ao gerar relatório:", error);
  process.exit(1);
}
