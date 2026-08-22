/**
 * Provider-agnostic AI domain types.
 *
 * Nothing outside `/services/ai` should know which vendor/SDK is used.
 */

export type AIProviderName = "lovable" | "openai-compatible";

export interface AITokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AICompletionRequest {
  /** System instructions (behaviour only, never sensitive data). */
  system?: string;
  /** User prompt: must contain only the data strictly required for the task. */
  prompt: string;
  /** Hard cap for generated tokens. */
  maxOutputTokens: number;
  temperature?: number;
  /** When true the provider is asked to return a single JSON object. */
  json?: boolean;
}

export interface AICompletionResult {
  text: string;
  usage: AITokenUsage;
  model: string;
  provider: string;
  finishReason: string;
}

/** Redacted, persistable telemetry for one LLM call. */
export interface AICallTelemetry {
  provider: string;
  model: string;
  task: string;
  attempts: number;
  durationMs: number;
  usage: AITokenUsage;
  /** Estimated cost in USD, based on the configured price table. */
  estimatedCostUsd: number;
  /** Names of the fields sent to the model (values are never logged). */
  inputFields: string[];
  truncated: boolean;
}

export interface AIStructuredResult<T> {
  data: T;
  telemetry: AICallTelemetry;
}
