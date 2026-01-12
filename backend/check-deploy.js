#!/usr/bin/env node

/**
 * Script de Verificação Pré-Deploy
 * Valida se o projeto está pronto para deploy
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("🔍 Verificando projeto para deploy...\n");

let errors = 0;
let warnings = 0;

// Verificar arquivos essenciais
const requiredFiles = [
  { path: "backend/package.json", desc: "Package.json do backend" },
  { path: "backend/server.js", desc: "Servidor backend" },
  { path: "backend/database.js", desc: "Configuração do banco" },
  { path: "backend/.env.example", desc: "Exemplo de variáveis de ambiente" },
  { path: "backend/render.yaml", desc: "Configuração do Render" },
  { path: "frontend/package.json", desc: "Package.json do frontend" },
  { path: "frontend/vite.config.js", desc: "Configuração do Vite" },
  { path: "vercel.json", desc: "Configuração do Vercel" },
  { path: "README.md", desc: "Documentação principal" },
  { path: "DEPLOY.md", desc: "Guia de deploy" },
];

console.log("📁 Verificando arquivos essenciais:");
requiredFiles.forEach((file) => {
  const fullPath = join(__dirname, "..", file.path);
  if (existsSync(fullPath)) {
    console.log(`  ✅ ${file.desc}`);
  } else {
    console.log(`  ❌ ${file.desc} - FALTANDO`);
    errors++;
  }
});

// Verificar .gitignore
console.log("\n🚫 Verificando .gitignore:");
const gitignorePath = join(__dirname, "..", ".gitignore");
if (existsSync(gitignorePath)) {
  const gitignore = readFileSync(gitignorePath, "utf-8");
  const requiredIgnores = [".env", "node_modules/", "*.log"];
  requiredIgnores.forEach((pattern) => {
    if (gitignore.includes(pattern)) {
      console.log(`  ✅ ${pattern} está no .gitignore`);
    } else {
      console.log(`  ⚠️  ${pattern} NÃO está no .gitignore`);
      warnings++;
    }
  });
}

// Verificar package.json do backend
console.log("\n📦 Verificando dependências do backend:");
const backendPkgPath = join(__dirname, "..", "backend", "package.json");
if (existsSync(backendPkgPath)) {
  const pkg = JSON.parse(readFileSync(backendPkgPath, "utf-8"));
  const requiredDeps = [
    "express",
    "pg",
    "dotenv",
    "cors",
    "winston",
    "compression",
    "express-validator",
  ];

  requiredDeps.forEach((dep) => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep} - FALTANDO`);
      errors++;
    }
  });

  // Verificar scripts
  if (pkg.scripts && pkg.scripts.start) {
    console.log(`  ✅ Script "start" configurado`);
  } else {
    console.log(`  ❌ Script "start" não encontrado`);
    errors++;
  }
}

// Verificar package.json do frontend
console.log("\n📦 Verificando dependências do frontend:");
const frontendPkgPath = join(__dirname, "..", "frontend", "package.json");
if (existsSync(frontendPkgPath)) {
  const pkg = JSON.parse(readFileSync(frontendPkgPath, "utf-8"));
  const requiredDeps = ["react", "react-dom", "react-router-dom", "axios"];

  requiredDeps.forEach((dep) => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep} - FALTANDO`);
      errors++;
    }
  });

  // Verificar scripts
  const requiredScripts = ["dev", "build", "preview"];
  requiredScripts.forEach((script) => {
    if (pkg.scripts && pkg.scripts[script]) {
      console.log(`  ✅ Script "${script}" configurado`);
    } else {
      console.log(`  ❌ Script "${script}" não encontrado`);
      errors++;
    }
  });
}

// Verificar configuração do Render
console.log("\n🚀 Verificando render.yaml:");
const renderPath = join(__dirname, "..", "backend", "render.yaml");
if (existsSync(renderPath)) {
  const renderConfig = readFileSync(renderPath, "utf-8");

  if (renderConfig.includes("healthCheckPath: /api/health")) {
    console.log("  ✅ Health check configurado corretamente");
  } else {
    console.log("  ⚠️  Health check pode estar incorreto");
    warnings++;
  }

  if (renderConfig.includes("NODE_ENV")) {
    console.log("  ✅ NODE_ENV configurado");
  } else {
    console.log("  ⚠️  NODE_ENV não encontrado");
    warnings++;
  }

  if (renderConfig.includes("DATABASE_URL")) {
    console.log("  ✅ DATABASE_URL configurado");
  } else {
    console.log("  ❌ DATABASE_URL não encontrado");
    errors++;
  }
}

// Verificar configuração do Vercel
console.log("\n🚀 Verificando vercel.json:");
const vercelPath = join(__dirname, "..", "vercel.json");
if (existsSync(vercelPath)) {
  const vercelConfig = JSON.parse(readFileSync(vercelPath, "utf-8"));

  if (vercelConfig.outputDirectory) {
    console.log(`  ✅ Output directory: ${vercelConfig.outputDirectory}`);
  } else {
    console.log("  ⚠️  Output directory não especificado");
    warnings++;
  }

  if (vercelConfig.rewrites) {
    console.log("  ✅ Rewrites configurados (SPA)");
  } else {
    console.log("  ⚠️  Rewrites não configurados");
    warnings++;
  }
}

// Verificar se .env existe (mas não deve estar no git)
console.log("\n🔐 Verificando variáveis de ambiente:");
const envPath = join(__dirname, "..", "backend", ".env");
if (existsSync(envPath)) {
  console.log("  ✅ Arquivo .env existe localmente");
  const envContent = readFileSync(envPath, "utf-8");

  if (envContent.includes("DATABASE_URL")) {
    console.log("  ✅ DATABASE_URL configurada");
  } else {
    console.log("  ❌ DATABASE_URL não encontrada no .env");
    errors++;
  }
} else {
  console.log("  ⚠️  Arquivo .env não encontrado (OK se já fez deploy)");
}

// Resumo final
console.log("\n" + "=".repeat(50));
console.log("📊 RESUMO DA VERIFICAÇÃO");
console.log("=".repeat(50));

if (errors === 0 && warnings === 0) {
  console.log("\n✅ Tudo certo! Projeto pronto para deploy! 🚀");
  process.exit(0);
} else {
  console.log(`\n⚠️  Encontrados:`);
  console.log(`   - ${errors} erro(s) crítico(s)`);
  console.log(`   - ${warnings} aviso(s)`);

  if (errors > 0) {
    console.log("\n❌ Corrija os erros antes de fazer deploy!");
    process.exit(1);
  } else {
    console.log("\n⚠️  Revise os avisos, mas pode prosseguir com deploy.");
    process.exit(0);
  }
}
