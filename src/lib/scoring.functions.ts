import { createServerFn } from "@tanstack/react-start";

import { requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { scoreLeadSchema } from "@/lib/validation/scoring";
import { ScoringService } from "@/services/scoring/scoring-service";

/**
 * Scoring endpoint: session validated server-side, lead id validated and always
 * scoped to the authenticated user. The score itself is computed by the
 * deterministic engine — never by an LLM.
 */
const writeLimit = withRateLimit(RATE_LIMITS.leadWrite);

export const scoreLead = createServerFn({ method: "POST" })
  .middleware([requireAuth, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(scoreLeadSchema, data))
  .handler(({ data, context }) =>
    ScoringService.forUser(context.supabase, context.userId).scoreLead(data.leadId),
  );
