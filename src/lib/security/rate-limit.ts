import { AppError } from "@/lib/errors";

/**
 * Basic in-memory fixed-window rate limiter for sensitive operations.
 *
 * Server workers are stateless, so this is a best-effort throttle per worker
 * instance (protects against accidental floods and naive abuse). Hard limits
 * for money/abuse critical flows must live in the database.
 */

export interface RateLimitRule {
  /** Logical bucket name, e.g. `leads:create`. */
  key: string;
  /** Maximum number of hits allowed inside the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

interface Counter {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Counter>();
const MAX_BUCKETS = 5000;

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Muitas solicitações. Tente novamente em ${retryAfterSeconds}s.`, {
      code: "RATE_LIMITED",
      status: 429,
    });
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function prune(now: number): void {
  for (const [key, counter] of buckets) {
    if (counter.resetAt <= now) buckets.delete(key);
  }
}

/** Consumes one hit for `subject` (usually the authenticated user id). */
export function consumeRateLimit(rule: RateLimitRule, subject: string, now = Date.now()): void {
  if (buckets.size > MAX_BUCKETS) prune(now);

  const id = `${rule.key}:${subject}`;
  const current = buckets.get(id);

  if (!current || current.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + rule.windowMs });
    return;
  }

  if (current.count >= rule.limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
  }

  current.count += 1;
}

/** Test helper: clears all counters. */
export function resetRateLimits(): void {
  buckets.clear();
}

export const RATE_LIMITS = {
  leadWrite: { key: "leads:write", limit: 30, windowMs: 60_000 },
  leadDelete: { key: "leads:delete", limit: 20, windowMs: 60_000 },
  leadRead: { key: "leads:read", limit: 240, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;
