import { createServerFn } from "@tanstack/react-start";

import { requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { analyzeLeadSchema } from "@/lib/validation/analysis";
import { AnalysisService } from "@/services/analysis/analysis-service";

/**
 * Commercial analysis endpoints.
 * - the session is validated server-side and the lead is scoped to the user;
 * - the LLM only runs on explicit request (re-analysis), never on render;
 * - provider credentials stay on the server.
 */

const readLimit = withRateLimit(RATE_LIMITS.leadRead);
const analyzeLimit = withRateLimit(RATE_LIMITS.leadWrite);

export const getLeadAnalysis = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(analyzeLeadSchema, data))
  .handler(({ data, context }) =>
    AnalysisService.forUser(context.supabase, context.userId).getLatest(data.leadId),
  );

export const analyzeLeadCommercially = createServerFn({ method: "POST" })
  .middleware([requireAuth, analyzeLimit])
  .inputValidator((data: unknown) => parseOrThrow(analyzeLeadSchema, data))
  .handler(({ data, context }) =>
    AnalysisService.forUser(context.supabase, context.userId).analyzeLead(data.leadId, {
      subject: context.userId,
    }),
  );
