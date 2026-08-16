import type { RateLimitRule } from "./rate-limit";

/**
 * Enrichment performs external reads (website + Google), so it is throttled
 * per user to keep the app polite with third-party sources.
 */
export const ENRICHMENT_RATE_LIMITS = {
  run: { key: "enrichment:run", limit: 12, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;
