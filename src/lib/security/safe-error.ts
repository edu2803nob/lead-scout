import { AppError, ValidationError } from "@/lib/errors";

import { redactSecrets } from "./redact";

/** User-safe error payload — never carries stack traces or internals. */
export interface SafeError {
  code: string;
  status: number;
  message: string;
  issues?: Record<string, string>;
}

const GENERIC_MESSAGE = "Ocorreu um erro inesperado. Tente novamente.";

/**
 * Normalizes any throwable into a user-safe payload.
 * Unknown/internal errors are logged server-side (redacted) and replaced by a
 * generic message so stack traces and infrastructure details never leak.
 */
export function toSafeError(error: unknown, logContext?: string): SafeError {
  if (error instanceof ValidationError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
      issues: error.issues,
    };
  }

  if (error instanceof AppError) {
    return { code: error.code, status: error.status, message: redactSecrets(error.message) };
  }

  if (error instanceof Error && /unauthorized/i.test(error.message)) {
    return {
      code: "UNAUTHORIZED",
      status: 401,
      message: "Sessão inválida ou expirada. Entre novamente.",
    };
  }

  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[security] ${logContext ?? "unhandled"}: ${redactSecrets(details)}`);

  return { code: "INTERNAL_ERROR", status: 500, message: GENERIC_MESSAGE };
}
