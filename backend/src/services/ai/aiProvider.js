import { AppError } from "../../lib/AppError.js";
import logger from "../../config/logger.js";

const MENSAGEM_FALHA =
  "Não foi possível gerar sugestões agora. Você pode continuar criando o orçamento manualmente.";


export function lerConfigAi(env = process.env) {
  const provider = String(env.AI_PROVIDER || "").trim().toLowerCase();
  const model = String(env.AI_MODEL || "").trim();
  const timeoutMs = Number(env.AI_TIMEOUT_MS || 20000);
  const apiKey = String(env.AI_API_KEY || "").trim();
  const baseUrl = String(env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  return {
    provider,
    model: model || "gpt-4o-mini",
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000,
    apiKey,
    baseUrl,
  };
}

export function assistenteConfigurado(env = process.env) {
  const cfg = lerConfigAi(env);
  return cfg.provider === "openai" && cfg.apiKey.length > 0;
}

function erroConfigurado() {
  return new AppError(503, "Assistente de orçamento não configurado.");
}

function extrairJson(texto) {
  const bruto = String(texto || "").trim();
  if (!bruto) throw new AppError(502, MENSAGEM_FALHA);
  try {
    return JSON.parse(bruto);
  } catch {
    const inicio = bruto.indexOf("{");
    const fim = bruto.lastIndexOf("}");
    if (inicio >= 0 && fim > inicio) {
      return JSON.parse(bruto.slice(inicio, fim + 1));
    }
    throw new AppError(502, MENSAGEM_FALHA);
  }
}

async function chamarOpenAiCompativel(cfg, { systemPrompt, input }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });

    if (!response.ok) {
      const detalhe = (await response.text()).replaceAll(cfg.apiKey, "").slice(0, 300);
      logger.warn("Assistente: provedor recusou a chamada", {
        status: response.status,
        model: cfg.model,
        detalhe,
      });
      const falhaRede = response.status >= 500 || response.status === 429;
      const err = new AppError(502, MENSAGEM_FALHA);
      err.retryable = falhaRede;
      throw err;
    }

    const body = await response.json();
    const texto = body?.choices?.[0]?.message?.content;
    return {
      data: extrairJson(texto),
      usage: {
        input_tokens: body?.usage?.prompt_tokens ?? null,
        output_tokens: body?.usage?.completion_tokens ?? null,
      },
      provider: "openai",
      model: cfg.model,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err?.name === "AbortError") {
      const timeout = new AppError(504, MENSAGEM_FALHA);
      timeout.retryable = true;
      throw timeout;
    }
    const rede = new AppError(502, MENSAGEM_FALHA);
    rede.retryable = true;
    throw rede;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Único ponto do domínio para gerar JSON estruturado.
 * O service de orçamento não conhece o fornecedor.
 */
export async function generateStructured({ systemPrompt, input, schema, env = process.env, fetchImpl }) {
  const cfg = lerConfigAi(env);
  if (!assistenteConfigurado(env)) {
    throw erroConfigurado();
  }
  if (cfg.provider !== "openai") {
    throw erroConfigurado();
  }

  const executar = () =>
    fetchImpl
      ? fetchImpl(cfg, { systemPrompt, input })
      : chamarOpenAiCompativel(cfg, { systemPrompt, input });

  let resultado;
  try {
    resultado = await executar();
  } catch (err) {
    if (!err?.retryable) throw err;
    logger.warn("Assistente: nova tentativa após falha técnica", {
      provider: cfg.provider,
      model: cfg.model,
    });
    resultado = await executar();
  }

  if (schema) {
    const parsed = schema.safeParse(resultado.data);
    if (!parsed.success) {
      logger.warn("Assistente: JSON fora do formato esperado", {
        model: cfg.model,
        detalhe: parsed.error.issues
          .slice(0, 6)
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
        amostra: JSON.stringify(resultado.data).slice(0, 800),
      });
      throw new AppError(502, MENSAGEM_FALHA);
    }
    resultado.data = parsed.data;
  }

  return resultado;
}

export function getAiProvider(env = process.env) {
  return {
    provider: lerConfigAi(env).provider || null,
    model: lerConfigAi(env).model,
    configurado: assistenteConfigurado(env),
    generateStructured: (args) => generateStructured({ ...args, env }),
  };
}
