import { createServerFn } from "@tanstack/react-start";

import { requireAuth, withRateLimit } from "@/lib/auth/guards";
import { parseOrThrow } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { recommendOfferSchema } from "@/lib/validation/offer";
import { OfferService } from "@/services/offer/offer-service";

/**
 * Offer recommendation endpoints.
 * - the session is validated server-side and the lead is scoped to the user;
 * - the LLM only runs on explicit request, never on render;
 * - previous audits and analyses are read, never modified.
 */

const readLimit = withRateLimit(RATE_LIMITS.leadRead);
const writeLimit = withRateLimit(RATE_LIMITS.leadWrite);

export const getLeadOffer = createServerFn({ method: "GET" })
  .middleware([requireAuth, readLimit])
  .inputValidator((data: unknown) => parseOrThrow(recommendOfferSchema, data))
  .handler(({ data, context }) =>
    OfferService.forUser(context.supabase, context.userId).getLatest(data.leadId),
  );

export const recommendLeadOffer = createServerFn({ method: "POST" })
  .middleware([requireAuth, writeLimit])
  .inputValidator((data: unknown) => parseOrThrow(recommendOfferSchema, data))
  .handler(({ data, context }) =>
    OfferService.forUser(context.supabase, context.userId).recommendOffer(data.leadId, {
      subject: context.userId,
    }),
  );
