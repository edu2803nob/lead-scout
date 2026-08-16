import { z } from "zod";

/** Application-level error with a user-safe message. */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, options?: { code?: string; status?: number }) {
    super(message);
    this.name = "AppError";
    this.code = options?.code ?? "APP_ERROR";
    this.status = options?.status ?? 400;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Registro não encontrado") {
    super(message, { code: "NOT_FOUND", status: 404 });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  readonly issues: Record<string, string>;

  constructor(issues: Record<string, string>, message = "Dados inválidos") {
    super(message, { code: "VALIDATION_ERROR", status: 422 });
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/** Converts a Zod error into a flat field -> message map. */
export function toValidationError(error: z.ZodError): ValidationError {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    if (!issues[path]) issues[path] = issue.message;
  }
  return new ValidationError(issues);
}

/** Single entry point for turning unknown throwables into user-safe messages. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    const first = Object.values(error.issues)[0];
    return first ?? error.message;
  }
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    if (/unauthorized/i.test(error.message)) return "Sessão expirada. Entre novamente.";
    return error.message;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}

/** Validates input with a schema and throws a normalized ValidationError. */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}
