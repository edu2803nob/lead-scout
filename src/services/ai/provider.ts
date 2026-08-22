import { AppError } from "@/lib/errors";
import type { AICompletionRequest, AICompletionResult } from "@/types/ai";

/**
 * Provider contract. The rest of the system depends on this interface only —
 * never on a vendor SDK.
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  complete(
    request: AICompletionRequest,
    options?: { signal?: AbortSignal },
  ): Promise<AICompletionResult>;
}

export class AIConfigError extends AppError {
  constructor(message = "Serviço de IA não configurado.") {
    super(message, { code: "AI_CONFIG_ERROR", status: 500 });
    this.name = "AIConfigError";
  }
}

export class AIProviderError extends AppError {
  /** Upstream HTTP status, when available. */
  readonly providerStatus: number | undefined;
  readonly retryable: boolean;

  constructor(message: string, options?: { providerStatus?: number; retryable?: boolean }) {
    super(message, { code: "AI_PROVIDER_ERROR", status: 502 });
    this.name = "AIProviderError";
    this.providerStatus = options?.providerStatus;
    this.retryable = options?.retryable ?? false;
  }
}

export class AITimeoutError extends AppError {
  readonly retryable = true;

  constructor(timeoutMs: number) {
    super(`A análise de IA excedeu o tempo limite (${Math.round(timeoutMs / 1000)}s).`, {
      code: "AI_TIMEOUT",
      status: 504,
    });
    this.name = "AITimeoutError";
  }
}

export class AIInvalidResponseError extends AppError {
  readonly reason: "NOT_JSON" | "SCHEMA_MISMATCH" | "EMPTY" | "TRUNCATED" | "UNEXPECTED_CONTENT";

  constructor(reason: AIInvalidResponseError["reason"], detail?: string) {
    super("A IA retornou uma resposta inválida. Tente novamente.", {
      code: `AI_INVALID_RESPONSE_${reason}`,
      status: 502,
    });
    this.name = "AIInvalidResponseError";
    this.reason = reason;
    // `detail` is intentionally not part of the user-facing message.
    if (detail) this.detailForLogs = detail;
  }

  /** Short, non-sensitive detail kept for server-side logs only. */
  detailForLogs?: string;
}

export class AIBudgetError extends AppError {
  constructor(message = "Limite de custo de IA atingido. Tente novamente mais tarde.") {
    super(message, { code: "AI_BUDGET_EXCEEDED", status: 429 });
    this.name = "AIBudgetError";
  }
}

/** True when an error is worth retrying with backoff. */
export function isRetryableAIError(error: unknown): boolean {
  if (error instanceof AITimeoutError) return true;
  if (error instanceof AIProviderError) return error.retryable;
  if (error instanceof AIInvalidResponseError) {
    return error.reason === "NOT_JSON" || error.reason === "SCHEMA_MISMATCH";
  }
  return false;
}
