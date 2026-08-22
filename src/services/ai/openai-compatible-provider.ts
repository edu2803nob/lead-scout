import { LLM_DEFAULTS } from "@/config/llm";
import type { AICompletionRequest, AICompletionResult } from "@/types/ai";

import { AIProviderError, AITimeoutError, type AIProvider } from "./provider";

export interface OpenAICompatibleConfig {
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  /** Header carrying the credential. */
  authHeader: string;
  /** Optional prefix, e.g. `Bearer `. */
  authPrefix?: string;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}

interface ChatChoice {
  message?: { content?: string | null };
  finish_reason?: string | null;
}

interface ChatResponse {
  choices?: ChatChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * Thin adapter over any OpenAI-compatible `/chat/completions` endpoint.
 *
 * Deliberately uses `fetch` instead of a vendor SDK so swapping providers is a
 * configuration change, not a refactor.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  readonly model: string;
  private readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
    this.name = config.name;
    this.model = config.model;
  }

  async complete(
    request: AICompletionRequest,
    options?: { signal?: AbortSignal },
  ): Promise<AICompletionResult> {
    const timeoutMs = this.config.timeoutMs ?? LLM_DEFAULTS.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    options?.signal?.addEventListener("abort", onExternalAbort);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          [this.config.authHeader]: `${this.config.authPrefix ?? ""}${this.config.apiKey}`,
          ...this.config.extraHeaders,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxOutputTokens,
          temperature: request.temperature ?? LLM_DEFAULTS.temperature,
          ...(request.json ? { response_format: { type: "json_object" } } : {}),
          messages: [
            ...(request.system ? [{ role: "system", content: request.system }] : []),
            { role: "user", content: request.prompt },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const retryable = status === 429 || status >= 500;
        throw new AIProviderError(providerMessage(status), { providerStatus: status, retryable });
      }

      const payload = (await response.json()) as ChatResponse;
      const choice = payload.choices?.[0];
      const inputTokens = payload.usage?.prompt_tokens ?? 0;
      const outputTokens = payload.usage?.completion_tokens ?? 0;

      return {
        text: choice?.message?.content ?? "",
        finishReason: choice?.finish_reason ?? "stop",
        model: this.model,
        provider: this.name,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: payload.usage?.total_tokens ?? inputTokens + outputTokens,
        },
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (isAbortError(error)) throw new AITimeoutError(timeoutMs);
      // Network-level failure: retryable, message never exposes internals.
      throw new AIProviderError("Serviço de IA indisponível no momento.", { retryable: true });
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener("abort", onExternalAbort);
    }
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === "AbortError" || /abort/i.test(error.message ?? ""))
  );
}

/** User-safe messages per upstream status (see gateway error semantics). */
function providerMessage(status: number): string {
  if (status === 429) return "Muitas solicitações de IA. Tente novamente em instantes.";
  if (status === 402) return "Créditos de IA esgotados. Adicione créditos para continuar.";
  if (status === 403) return "O uso de IA está bloqueado para este workspace.";
  if (status === 401) return "Credencial de IA inválida.";
  if (status === 400) return "Requisição de IA inválida.";
  return "Falha temporária no serviço de IA.";
}
