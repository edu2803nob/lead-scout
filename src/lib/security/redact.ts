/**
 * Secret redaction helpers.
 *
 * Anything that leaves the server (log lines, error payloads) goes through
 * `redactSecrets` so keys, tokens and connection strings can never leak.
 */

const SENSITIVE_KEY_PATTERN =
  /(secret|token|password|passwd|apikey|api_key|authorization|service_role|anon_key|private_key|session)/i;

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs
  /sb_(?:publishable|secret)_[A-Za-z0-9_-]{8,}/g, // Supabase API keys
  /Bearer\s+[A-Za-z0-9._-]{8,}/gi,
  /postgres(?:ql)?:\/\/[^\s"']+/gi,
  /sk-[A-Za-z0-9]{16,}/g,
];

export const REDACTED = "[REDACTED]";

/** Replaces secret-looking substrings inside any text. */
export function redactSecrets(input: string): string {
  let output = input;
  for (const pattern of SECRET_VALUE_PATTERNS) {
    output = output.replace(pattern, REDACTED);
  }
  return output;
}

/** True when an object key looks like it holds a credential. */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

/** Deep-redacts an arbitrary value so it is safe to log or return. */
export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (typeof value === "string") return redactSecrets(value);
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = isSensitiveKey(key) ? REDACTED : redactValue(item, depth + 1);
  }
  return result;
}
