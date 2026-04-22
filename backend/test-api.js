import { spawn } from "child_process";

const TEST_PORT = process.env.TEST_PORT || "3099";
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const START_TIMEOUT_MS = 20000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, timeoutMs) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Server may not be up yet.
    }
    await sleep(500);
  }

  return false;
}

async function run() {
  console.log("[TEST] Iniciando smoke test da API...");

  const server = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: TEST_PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (data) => {
    process.stdout.write(`[SERVER] ${data}`);
  });

  server.stderr.on("data", (data) => {
    process.stderr.write(`[SERVER-ERR] ${data}`);
  });

  try {
    const healthReady = await waitForHealth(
      `${BASE_URL}/api/health`,
      START_TIMEOUT_MS,
    );

    if (!healthReady) {
      throw new Error("Timeout aguardando /api/health");
    }

    const healthRes = await fetch(`${BASE_URL}/api/health`);
    if (!healthRes.ok) {
      throw new Error(`Health check falhou com status ${healthRes.status}`);
    }

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (loginRes.status === 404) {
      throw new Error("Rota /api/auth/login não encontrada");
    }

    if (![400, 401, 200].includes(loginRes.status)) {
      throw new Error(
        `Resposta inesperada de /api/auth/login: ${loginRes.status}`,
      );
    }

    console.log("[TEST] Smoke test concluído com sucesso.");
    process.exitCode = 0;
  } catch (error) {
    console.error("[TEST] Falha no smoke test:", error.message);
    process.exitCode = 1;
  } finally {
    if (!server.killed) {
      server.kill();
      await sleep(300);
    }
  }
}

run();
