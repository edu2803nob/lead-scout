import type { RateLimitRule } from "./rate-limit";

/**
 * Prospecting is the only flow that spends external API quota, so it is
 * throttled more aggressively than ordinary CRUD.
 */
export const PROSPECTING_RATE_LIMITS = {
  run: { key: "prospecting:run", limit: 5, windowMs: 60_000 },
  import: { key: "prospecting:import", limit: 10, windowMs: 60_000 },
  read: { key: "prospecting:read", limit: 240, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;
