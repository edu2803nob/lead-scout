import { createServerFn } from "@tanstack/react-start";

import { requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { analyzeOpportunitySchema } from "@/lib/validation/opportunity";
import { OpportunityService } from "@/services/opportunity/opportunity-service";

/**
 * Landing Page Opportunity endpoint: session validated server-side, lead id
 * validated and always scoped to the authenticated user. The score is computed
 * by the deterministic engine — never by an LLM.
 */
const writeLimit = withRateLimit(RATE_LIMITS.leadWrite);

export const analyzeLeadOpportunity = createServerFn({ method: "POST" })
  .middleware([requireAuth, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(analyzeOpportunitySchema, data))
  .handler(({ data, context }) =>
    OpportunityService.forUser(context.supabase, context.userId).analyzeLead(data.leadId),
  );
