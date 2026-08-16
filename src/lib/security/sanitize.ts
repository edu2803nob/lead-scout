/** Input sanitization helpers used by the validation schemas. */

// eslint-disable-next-line no-control-regex -- intentional: strip control chars from input
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG = /<[^>]*>/g;
const LIKE_WILDCARDS = /[%_,()]/g;

/**
 * Normalizes free text coming from users: trims, removes control characters,
 * strips HTML tags (we never render raw HTML) and collapses whitespace.
 */
export function sanitizeText(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(HTML_TAG, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Makes a search term safe for PostgREST `ilike`/`or` filters by dropping
 * wildcard and delimiter characters that could alter the generated filter.
 */
export function sanitizeSearchTerm(value: string): string {
  return sanitizeText(value)
    .replace(LIKE_WILDCARDS, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Removes anything that is not a digit or a leading `+` from a phone number. */
export function sanitizePhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? `+${digits.replace(/\+/g, "")}` : digits.replace(/\+/g, "");
}

/** Keeps only same-origin relative paths, blocking open-redirect payloads. */
export function sanitizeRedirectPath(value: string, fallback = "/dashboard"): string {
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\r\n\t]/.test(value)) return fallback;
  return value;
}
