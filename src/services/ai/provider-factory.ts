import { LLM_DEFAULTS } from "@/config/llm";
import type { AIProviderName } from "@/types/ai";

import { OpenAICompatibleProvider } from "./openai-compatible-provider";
import { AIConfigError, type AIProvider } from "./provider";

export interface LLMEnvConfig {
  provider: AIProviderName;
  model: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

/**
 * Reads LLM configuration from server-side env only.
 * `LLM_API_KEY` is optional for the managed provider, which uses the
 * platform-managed key. Nothing here is ever exposed to the client.
 */
export function readLLMConfig(env: Record<string, string | undefined> = process.env): LLMEnvConfig {
  const provider = (env["LLM_PROVIDER"] ?? LLM_DEFAULTS.provider) as AIProviderName;
  const model = env["LLM_MODEL"] ?? LLM_DEFAULTS.model;
  const baseUrl = env["LLM_BASE_URL"] ?? LLM_DEFAULTS.baseUrl;
  const timeoutMs = Number(env["LLM_TIMEOUT_MS"] ?? LLM_DEFAULTS.timeoutMs);

  const apiKey =
    env["LLM_API_KEY"] ?? (provider === "lovable" ? (env["LOVABLE_API_KEY"] ?? "") : "");

  if (!apiKey) throw new AIConfigError();
  if (provider !== "lovable" && provider !== "openai-compatible") {
    throw new AIConfigError("Provedor de IA não suportado.");
  }

  return {
    provider,
    model,
    apiKey,
    baseUrl,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : LLM_DEFAULTS.timeoutMs,
  };
}

/** Builds the configured provider adapter. */
export function createProvider(config: LLMEnvConfig): AIProvider {
  if (config.provider === "lovable") {
    return new OpenAICompatibleProvider({
      name: "lovable",
      model: config.model,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      authHeader: "Lovable-API-Key",
      timeoutMs: config.timeoutMs,
    });
  }

  return new OpenAICompatibleProvider({
    name: "openai-compatible",
    model: config.model,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    timeoutMs: config.timeoutMs,
  });
}
