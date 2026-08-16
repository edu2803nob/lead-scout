import { createServerFn } from "@tanstack/react-start";

import { requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { ENRICHMENT_RATE_LIMITS } from "@/lib/security/enrichment-limits";
import { enrichLeadSchema } from "@/lib/validation/enrichment";
import { EnrichmentService } from "@/services/enrichment/enrichment-service";

/**
 * Enrichment endpoint.
 * - session validated server-side; the user id comes from the verified token;
 * - the lead id is validated and always scoped to that user;
 * - provider credentials never reach the client.
 */
const runLimit = withRateLimit(ENRICHMENT_RATE_LIMITS.run);

export const enrichLead = createServerFn({ method: "POST" })
  .middleware([requireAuth, runLimit])
  .inputValidator((data: unknown) => parseOrThrow(enrichLeadSchema, data))
  .handler(({ data, context }) =>
    EnrichmentService.forUser(context.supabase, context.userId).enrich(data.leadId),
  );
