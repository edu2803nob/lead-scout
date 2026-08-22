import type { AIProviderName } from "@/types/ai";

/**
 * Central LLM configuration.
 *
 * Everything tunable (timeouts, retries, token/cost limits) lives here so the
 * service layer stays free of magic numbers.
 */

export const LLM_DEFAULTS = {
  provider: "lovable" as AIProviderName,
  /** Default model when `LLM_MODEL` is not set. */
  model: "google/gemini-2.5-flash",
  baseUrl: "https://ai.gateway.lovable.dev/v1",
  /** Per-attempt timeout. */
  timeoutMs: 30_000,
  /** Total attempts (1 initial + retries). */
  maxAttempts: 3,
  /** Base backoff between retries, doubled per attempt. */
  retryBaseDelayMs: 500,
  temperature: 0.2,
  /** Hard cap for generated tokens. */
  maxOutputTokens: 1_200,
  /** Hard cap for prompt size (characters) — prompts above this are rejected. */
  maxPromptChars: 12_000,
  /** Maximum characters allowed per single input field value. */
  maxFieldChars: 1_500,
} as const;

/** Price table in USD per 1M tokens; used only for cost estimation/limits. */
export const LLM_PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "google/gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  default: { input: 0.5, output: 3 },
};

export const LLM_COST_LIMITS = {
  /** Rejects a call whose estimated cost exceeds this value. */
  maxCostPerCallUsd: 0.05,
  /** Rolling budget per subject (user) inside the window. */
  maxCostPerSubjectUsd: 1,
  windowMs: 60 * 60_000,
} as const;

export function priceFor(model: string) {
  return LLM_PRICING[model] ?? LLM_PRICING["default"]!;
}

/** Estimated cost in USD for a given usage. */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = priceFor(model);
  const cost = (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/** Rough token estimate (~4 chars/token) used before calling the provider. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
