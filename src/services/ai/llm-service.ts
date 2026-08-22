import { z } from "zod";

import { LLM_DEFAULTS, estimateCostUsd, estimateTokens } from "@/config/llm";
import { isSensitiveKey } from "@/lib/security/redact";
import type { AICallTelemetry, AIStructuredResult } from "@/types/ai";

import { assertCallCost, assertSubjectBudget, recordSpend } from "./cost-guard";
import { parseStructuredResponse } from "./json";
import { createProvider, readLLMConfig } from "./provider-factory";
import { AIInvalidResponseError, isRetryableAIError, type AIProvider } from "./provider";

export interface LLMServiceOptions {
  maxAttempts?: number;
  retryBaseDelayMs?: number;
  /** Injectable sleep, so tests never wait. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface AnalyzeStructuredDataInput<S extends z.ZodTypeAny> {
  /** Short task identifier used in logs, e.g. `lead.summary`. */
  task: string;
  /** Behaviour instructions. Must not contain business data. */
  instructions: string;
  /** Output schema — responses that do not conform are rejected. */
  schema: S;
  /** Only the fields strictly required by the task. */
  data: Record<string, unknown>;
  /** Budget subject, normally the authenticated user id. */
  subject?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Provider-independent LLM service.
 *
 * Responsibilities: minimal input, token/cost limits, timeout + controlled
 * retry, structured JSON output with schema validation, and redacted logging.
 * Prompts are never persisted or logged — only field names and telemetry.
 */
export class LLMService {
  private readonly provider: AIProvider;
  private readonly maxAttempts: number;
  private readonly retryBaseDelayMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(provider: AIProvider, options: LLMServiceOptions = {}) {
    this.provider = provider;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? LLM_DEFAULTS.maxAttempts);
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? LLM_DEFAULTS.retryBaseDelayMs;
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? (() => Date.now());
  }

  /** Builds the service from server-side env configuration. */
  static fromEnv(options: LLMServiceOptions = {}): LLMService {
    const config = readLLMConfig();
    return new LLMService(createProvider(config), options);
  }

  /**
   * Runs a structured analysis: sends only the given fields, requires a JSON
   * object matching `schema`, and rejects anything else.
   */
  async analyzeStructuredData<S extends z.ZodTypeAny>(
    input: AnalyzeStructuredDataInput<S>,
  ): Promise<AIStructuredResult<z.output<S>>> {
    const { fields, payload, truncated } = buildMinimalPayload(input.data);
    const prompt = buildPrompt(payload);
    const system = `${input.instructions.trim()}\n\nResponda somente com um objeto JSON válido, sem texto adicional, sem markdown.`;

    if (prompt.length > LLM_DEFAULTS.maxPromptChars) {
      throw new AIInvalidResponseError("UNEXPECTED_CONTENT", "prompt above size limit");
    }

    const maxOutputTokens = Math.min(
      input.maxOutputTokens ?? LLM_DEFAULTS.maxOutputTokens,
      LLM_DEFAULTS.maxOutputTokens,
    );

    // Cost control before any network call.
    assertCallCost(
      estimateCostUsd(this.provider.model, estimateTokens(system + prompt), maxOutputTokens),
    );
    if (input.subject) assertSubjectBudget(input.subject, this.now());

    const startedAt = this.now();
    let attempts = 0;
    let lastError: unknown;

    while (attempts < this.maxAttempts) {
      attempts += 1;
      try {
        const completion = await this.provider.complete({
          system,
          prompt,
          json: true,
          maxOutputTokens,
          temperature: input.temperature ?? LLM_DEFAULTS.temperature,
        });

        if (completion.finishReason === "length") {
          throw new AIInvalidResponseError("TRUNCATED", "output token limit reached");
        }

        const data = parseStructuredResponse(input.schema, completion.text);

        const estimatedCostUsd = estimateCostUsd(
          completion.model,
          completion.usage.inputTokens || estimateTokens(system + prompt),
          completion.usage.outputTokens,
        );
        if (input.subject) recordSpend(input.subject, estimatedCostUsd, this.now());

        const telemetry: AICallTelemetry = {
          provider: completion.provider,
          model: completion.model,
          task: input.task,
          attempts,
          durationMs: this.now() - startedAt,
          usage: completion.usage,
          estimatedCostUsd,
          inputFields: fields,
          truncated,
        };

        logTelemetry(telemetry);
        return { data, telemetry };
      } catch (error) {
        lastError = error;
        if (!isRetryableAIError(error) || attempts >= this.maxAttempts) break;
        await this.sleep(this.retryBaseDelayMs * 2 ** (attempts - 1));
      }
    }

    logFailure(input.task, this.provider, attempts, lastError);
    throw lastError;
  }
}

/**
 * Keeps only meaningful values, drops credential-looking keys and truncates
 * long text, so the model receives the minimum necessary data.
 */
export function buildMinimalPayload(data: Record<string, unknown>): {
  payload: Record<string, unknown>;
  fields: string[];
  truncated: boolean;
} {
  const payload: Record<string, unknown> = {};
  let truncated = false;

  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      const text = value.trim();
      if (!text) continue;
      if (text.length > LLM_DEFAULTS.maxFieldChars) {
        truncated = true;
        payload[key] = `${text.slice(0, LLM_DEFAULTS.maxFieldChars)}…`;
        continue;
      }
      payload[key] = text;
      continue;
    }
    if (Array.isArray(value) && value.length === 0) continue;
    payload[key] = value;
  }

  return { payload, fields: Object.keys(payload), truncated };
}

function buildPrompt(payload: Record<string, unknown>): string {
  return `DADOS:\n${JSON.stringify(payload)}`;
}

/** Logs telemetry only — never the prompt, the response text or field values. */
function logTelemetry(telemetry: AICallTelemetry): void {
  console.info(
    `[ai] ${telemetry.task} provider=${telemetry.provider} model=${telemetry.model} attempts=${telemetry.attempts} tokens=${telemetry.usage.totalTokens} cost=${telemetry.estimatedCostUsd} fields=${telemetry.inputFields.length} durationMs=${telemetry.durationMs}`,
  );
}

function logFailure(task: string, provider: AIProvider, attempts: number, error: unknown): void {
  const code =
    error instanceof Error ? ((error as { code?: string }).code ?? error.name) : "unknown";
  console.error(`[ai] ${task} failed provider=${provider.name} attempts=${attempts} code=${code}`);
}
